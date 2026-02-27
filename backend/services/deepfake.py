"""
Deepfake detection service — multi-signal heuristic pipeline.

Signal philosophy:
  Each sub-detector is calibrated so a *typical unedited JPEG* scores ≈ 0.10–0.25.
  Scores above 0.50 indicate genuine anomaly. The ensemble uses conservative weights so
  false-positive rate on real images stays low.

Returns rich per-signal scores for the UI and a weighted overall_score 0-1.
"""

import io
import math
import numpy as np
from PIL import Image, ImageChops
from typing import Dict, Tuple, List
from models.schemas import DeepfakeScore
from services.forensics import compute_noise_inconsistency, detect_double_compression, perform_ela


# ── Label helper ─────────────────────────────────────────────────────────────
def _confidence_label(score: float) -> str:
    if score < 0.20:
        return "Very Low"
    elif score < 0.38:
        return "Low"
    elif score < 0.55:
        return "Medium"
    elif score < 0.72:
        return "High"
    else:
        return "Very High"


# ── GAN artifact detector ─────────────────────────────────────────────────────
def _detect_gan_artifacts(image_path: str) -> float:
    """
    GAN-generated images leave spectral fingerprints (grid artefacts) in the
    high-frequency Fourier domain.  Real camera images have a smooth 1/f spectrum.

    We measure how much the MID-frequency ring deviates *above* the expected
    1/f trend — not just its raw ratio to low-freq energy.

    Typical real image  → 0.05–0.22
    GAN/diffusion image → 0.30–0.70
    """
    try:
        img = Image.open(image_path).convert("L").resize((256, 256), Image.BILINEAR)
        arr = np.array(img, dtype=np.float32)

        fft      = np.fft.fft2(arr)
        shifted  = np.fft.fftshift(fft)
        magnitude = np.log1p(np.abs(shifted))          # log1p is more stable

        h, w = magnitude.shape
        cx, cy = h // 2, w // 2
        y_coords, x_coords = np.ogrid[:h, :w]
        dist = np.sqrt((y_coords - cx) ** 2 + (x_coords - cy) ** 2)

        ring_inner = min(h, w) // 10   # ≈ 12px  — very low freq
        ring_mid1  = min(h, w) // 6    # ≈ 21px
        ring_mid2  = min(h, w) // 3    # ≈ 42px
        ring_outer = min(h, w) // 2    # ≈ 64px  — above Nyquist

        def ring_mean(r1, r2):
            mask = (dist >= r1) & (dist < r2)
            return float(np.mean(magnitude[mask])) if mask.any() else 0.0

        e_low  = ring_mean(0,         ring_inner)
        e_mid1 = ring_mean(ring_inner, ring_mid1)
        e_mid2 = ring_mean(ring_mid1,  ring_mid2)
        e_high = ring_mean(ring_mid2,  ring_outer)

        if e_low < 1e-6:
            return 0.15

        # Natural 1/f decay: e_mid2 / e_mid1 ≈ 0.6-0.8; deviations = GAN
        natural_decay = e_mid2 / (e_mid1 + 1e-6)
        # Also check for unnatural high-freq spike (checkerboard pattern from conv upsampling)
        checkerboard = e_high / (e_mid2 + 1e-6)

        # Combine: deviation from expected 0.70 decay + checkerboard spike
        decay_anomaly  = max(0.0, 0.70 - natural_decay) * 0.5  
        checker_anomaly = max(0.0, checkerboard - 0.52) * 1.3

        # --- Refined Spectral Peak Detection (v1.5) ---
        peaks = 0.0
        row_means = np.mean(magnitude, axis=0)
        col_means = np.mean(magnitude, axis=1)
        
        def detect_spikes(data):
            median = np.median(data)
            mad = np.median(np.abs(data - median))
            spike_count = np.sum(data > median + 3.6 * mad) # v1.8: adjusted from 3.4
            return float(spike_count)

        r_spikes = detect_spikes(row_means)
        c_spikes = detect_spikes(col_means)
        
        if r_spikes > 12 or c_spikes > 12:
            peaks = 0.35 + min(max(r_spikes, c_spikes) / 50.0, 0.60)

        score = min(decay_anomaly + checker_anomaly + peaks, 1.0)
        return round(float(score), 4)

    except Exception:
        return 0.15


# ── Color Channel Inconsistency ───────────────────────────────────────────
def _detect_color_inconsistency(image_path: str) -> float:
    """
    Measures correlation between R, G, B channels across blocks.
    """
    try:
        img = Image.open(image_path).convert("RGB").resize((256, 256), Image.BILINEAR)
        arr = np.array(img, dtype=np.float32)

        r_chan = arr[:, :, 0]
        g_chan = arr[:, :, 1]
        b_chan = arr[:, :, 2]

        block_size = 32
        correlations = []
        for r in range(0, 256, block_size):
            for c in range(0, 256, block_size):
                rb_block = r_chan[r:r+block_size, c:c+block_size].flatten()
                gb_block = g_chan[r:r+block_size, c:c+block_size].flatten()
                if np.std(rb_block) > 0 and np.std(gb_block) > 0:
                    corr = np.corrcoef(rb_block, gb_block)[0, 1]
                    correlations.append(float(corr))

        if not correlations:
            return 0.15

        std_corr = np.std(correlations)
        # v1.5 calibration: std_corr > 0.08 is flagged
        score = min(max(std_corr - 0.08, 0) * 5.0, 1.0)
        return round(float(score), 4)
    except Exception:
        return 0.10


# ── Face-swap / boundary detector ───────────────────────────────────────────
def _detect_face_swap(image_path: str) -> float:
    """
    Face-swapped images have unnatural DISCONTINUITIES in edge-gradient distributions.
    """
    try:
        from scipy.ndimage import sobel as scipy_sobel

        img  = Image.open(image_path).convert("L").resize((256, 256), Image.BILINEAR)
        arr  = np.array(img, dtype=np.float32)

        sx    = scipy_sobel(arr, axis=0)
        sy    = scipy_sobel(arr, axis=1)
        edges = np.hypot(sx, sy)

        block_size = 16
        means, variances = [], []
        for r in range(0, 256 - block_size, block_size):
            for c in range(0, 256 - block_size, block_size):
                block = edges[r:r+block_size, c:c+block_size]
                means.append(float(np.mean(block)))
                variances.append(float(np.var(block)))

        if len(variances) < 4:
            return 0.10

        mean_arr = np.array(means)
        var_arr  = np.array(variances)

        cv = float(np.std(mean_arr) / (np.mean(mean_arr) + 1e-6))
        v_mean = float(np.mean(var_arr))
        v_std  = float(np.std(var_arr))
        outlier_frac = float(np.mean(var_arr > v_mean + 2.0 * v_std)) # v1.7 balance: lowered threshold

        cv_score      = min(max(cv - 1.1, 0.0) / 1.0, 1.0)        
        outlier_score = min(outlier_frac / 0.11, 1.0) # v1.7: lowered from 0.14

        score = cv_score * 0.40 + outlier_score * 0.60
        return round(float(score), 4)

    except Exception:
        return 0.10


# ── Texture Smoothness (AI images are unnaturally smooth) ────────────────────
def _detect_texture_smoothness(image_path: str) -> float:
    """
    AI-generated images often have unnaturally smooth local texture.
    Real camera images have natural sensor noise, yielding higher local variance.
    Returns 0 (natural noise) → 1 (suspiciously smooth / AI-like).
    """
    try:
        img = Image.open(image_path).convert("L").resize((128, 128), Image.BILINEAR)
        arr = np.array(img, dtype=np.float32)

        # Compute local variance across 8x8 blocks
        block_size = 8
        variances = []
        for r in range(0, 128 - block_size, block_size):
            for c in range(0, 128 - block_size, block_size):
                block = arr[r:r+block_size, c:c+block_size]
                variances.append(float(np.var(block)))

        if not variances:
            return 0.10

        avg_var = float(np.mean(variances))
        # Real camera photos: avg block variance ~ 80-400
        # AI images (smooth skin/background): avg block variance ~ 10-80
        # Map: low variance = high anomaly score
        score = max(0.0, 1.0 - (avg_var / 120.0))
        return round(min(float(score), 1.0), 4)
    except Exception:
        return 0.10


# ── Histogram Regularity (AI images have smooth/blended histograms) ───────────
def _detect_histogram_regularity(image_path: str) -> float:
    """
    Real photos have irregular, spiky histograms due to natural scene variety.
    AI images (especially faces) often have unnaturally smooth, rounded distributions.
    Returns 0 (irregular = real) → 1 (suspiciously smooth = AI-like).
    """
    try:
        img = Image.open(image_path).convert("L")
        arr = np.array(img, dtype=np.float32)

        hist, _ = np.histogram(arr, bins=64, range=(0, 256))
        hist = hist.astype(np.float32)
        hist_norm = hist / (hist.sum() + 1e-6)

        # Measure 'jaggedness' — real images have high variance between adjacent bins
        diffs = np.abs(np.diff(hist_norm))
        jaggedness = float(np.mean(diffs))

        # Real photos: jaggedness > 0.005
        # AI images: jaggedness < 0.003 (smooth, blended)
        score = max(0.0, 1.0 - (jaggedness / 0.005))
        return round(min(float(score), 1.0), 4)
    except Exception:
        return 0.10


# ── Compression inconsistency ────────────────────────────────────────────────
def _compression_analysis(image_path: str) -> float:
    return detect_double_compression(image_path)


# ── Combined analysis ─────────────────────────────────────────────────────────
def analyze_image(image_path: str) -> Tuple[DeepfakeScore, List[List[float]]]:
    """
    Full deepfake analysis pipeline. Returns (DeepfakeScore, ela_heatmap).

    Stable signal ensemble (v2.1 — reverted to 6 proven signals):
      ELA           0.30   (JPEG re-save difference, reliable for manipulated areas)
      GAN           0.25   (Fourier spectral fingerprints)
      Face-swap     0.15   (Edge gradient discontinuities)
      Noise         0.15   (Sensor noise inconsistency)
      Color         0.10   (Channel correlation variance)
      Compression   0.05   (Double-compression DCT artifacts)
    """
    ela_map, ela_score      = perform_ela(image_path)
    gan_score               = _detect_gan_artifacts(image_path)
    face_swap_score         = _detect_face_swap(image_path)
    noise_score             = compute_noise_inconsistency(image_path)
    color_score             = _detect_color_inconsistency(image_path)
    compression_score       = _compression_analysis(image_path)

    weights = {
        "ela":         0.30,
        "gan":         0.25,
        "face_swap":   0.15,
        "noise":       0.15,
        "color":       0.10,
        "compression": 0.05,
    }

    overall = (
        ela_score           * weights["ela"]
        + gan_score         * weights["gan"]
        + face_swap_score   * weights["face_swap"]
        + noise_score       * weights["noise"]
        + color_score       * weights["color"]
        + compression_score * weights["compression"]
    )
    overall = round(min(float(overall), 1.0), 4)

    # Stable threshold 0.28  (v2.1 calibration)
    # Real photos typically score 0.10-0.22; AI/manipulated 0.25-0.55
    is_deepfake = overall > 0.28
    label       = _confidence_label(overall)

    score = DeepfakeScore(
        overall_score=overall,
        face_swap_score=round(face_swap_score, 4),
        gan_artifact_score=round(gan_score, 4),
        compression_inconsistency=round(compression_score, 4),
        noise_inconsistency=round(noise_score, 4),
        ela_score=round(ela_score, 4),
        is_deepfake=is_deepfake,
        confidence_label=label,
        model_version="FakeLineage-v2.1",
    )
    return score, ela_map


def analyze_image_series(image_paths: list) -> list:
    results = []
    for i, path in enumerate(image_paths):
        try:
            score, ela_map = analyze_image(path)
            results.append({
                "index": i, "path": path,
                "overall_score": score.overall_score,
                "is_deepfake": score.is_deepfake,
                "label": score.confidence_label,
            })
        except Exception as e:
            results.append({"index": i, "path": path, "error": str(e)})
    return results
