"""
Metadata extraction service — EXIF data, GPS, timestamps, camera info, and
consistency analysis for detecting stripped or tampered metadata.
"""

import random
import math
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from typing import Dict, Any, Optional, Tuple, List
from models.schemas import MetadataAnalysis
from services.forensics import lsb_steganography_scan


def _get_exif_data(image_path: str) -> Dict[str, Any]:
    """Extract EXIF data from image."""
    try:
        img = Image.open(image_path)
        exif_raw = img._getexif()
        if not exif_raw:
            return {}
        return {TAGS.get(k, str(k)): v for k, v in exif_raw.items()}
    except Exception:
        return {}


def _parse_gps(exif: Dict[str, Any]) -> Tuple[Optional[float], Optional[float]]:
    """Extract GPS coordinates from EXIF data."""
    try:
        gps_info = exif.get("GPSInfo")
        if not gps_info:
            return None, None
        gps = {GPSTAGS.get(k, k): v for k, v in gps_info.items()}

        def to_degrees(values):
            d, m, s = float(values[0]), float(values[1]), float(values[2])
            return d + (m / 60.0) + (s / 3600.0)

        lat = to_degrees(gps.get("GPSLatitude", [0, 0, 0]))
        if gps.get("GPSLatitudeRef") == "S":
            lat = -lat
        lon = to_degrees(gps.get("GPSLongitude", [0, 0, 0]))
        if gps.get("GPSLongitudeRef") == "W":
            lon = -lon
        return round(lat, 6), round(lon, 6)
    except Exception:
        return None, None


def _estimate_compression_quality(image_path: str) -> Optional[int]:
    """Estimate JPEG compression quality from quantization tables."""
    try:
        img = Image.open(image_path)
        if hasattr(img, "quantization"):
            quant = img.quantization.get(0, [])
            if quant:
                avg_q = sum(quant) / len(quant)
                # Rough approximation: lower avg quantization = higher quality
                quality = max(1, min(100, int(100 - avg_q * 0.8)))
                return quality
        return None
    except Exception:
        return None


def _check_metadata_consistency(exif: Dict[str, Any], image_path: str) -> Tuple[float, List[str]]:
    """
    Analyse consistency of metadata fields.
    Returns (score 0-1 where 1=perfectly consistent, flags list).
    """
    flags = []
    score = 1.0

    # Check for software that indicates editing
    software = str(exif.get("Software", "")).lower()
    editing_software = ["photoshop", "gimp", "lightroom", "affinity", "capture one", "snapseed", "facetune"]
    for sw in editing_software:
        if sw in software:
            flags.append(f"Image processed with editing software: {exif.get('Software')}")
            score -= 0.2
            break

    # Check datetime consistency
    dt_orig = exif.get("DateTimeOriginal")
    dt_digitized = exif.get("DateTimeDigitized")
    dt_modified = exif.get("DateTime")
    if dt_orig and dt_modified and dt_orig != dt_modified:
        flags.append("Modification date differs from original capture date")
        score -= 0.15

    # Check for missing critical fields in DSLR-expected images
    if exif:
        if not exif.get("Make"):
            flags.append("Camera make missing from EXIF (possible metadata stripping)")
            score -= 0.1
        if not exif.get("Model"):
            flags.append("Camera model missing from EXIF")
            score -= 0.05

    # Check thumbnail consistency (basic)
    try:
        img = Image.open(image_path)
        exif_data = img._getexif() or {}
        thumbnail_key = 513  # JPEGInterchangeFormat
        if thumbnail_key not in exif_data and len(exif) > 5:
            flags.append("Thumbnail missing despite rich EXIF — possible metadata tampering")
            score -= 0.1
    except Exception:
        pass

    return max(0.0, round(score, 3)), flags


def extract_metadata(image_path: str) -> MetadataAnalysis:
    """Full metadata analysis pipeline."""
    try:
        img = Image.open(image_path)
        img_format = img.format or "Unknown"
        img_width, img_height = img.size
        color_space = img.mode

        exif = _get_exif_data(image_path)
        has_exif = bool(exif)

        lat, lon = _parse_gps(exif)
        compression_quality = _estimate_compression_quality(image_path)
        consistency_score, consistency_flags = _check_metadata_consistency(exif, image_path)

        # LSB steganography scan
        stego_detected, lsb_score, stego_flags = lsb_steganography_scan(image_path)

        all_flags = consistency_flags + stego_flags
        if not has_exif:
            all_flags.append("No EXIF metadata found — may have been stripped")

        return MetadataAnalysis(
            image_id="",  # Will be filled by router
            has_exif=has_exif,
            camera_make=str(exif.get("Make", "")) or None,
            camera_model=str(exif.get("Model", "")) or None,
            software=str(exif.get("Software", "")) or None,
            datetime_original=str(exif.get("DateTimeOriginal", "")) or None,
            gps_latitude=lat,
            gps_longitude=lon,
            image_width=img_width,
            image_height=img_height,
            color_space=color_space,
            compression_quality=compression_quality,
            steganography_detected=stego_detected,
            lsb_anomaly_score=lsb_score,
            metadata_stripped=not has_exif,
            consistency_score=consistency_score,
            suspicious_flags=all_flags
        )
    except Exception as e:
        # Return minimal object on error
        return MetadataAnalysis(
            image_id="",
            has_exif=False,
            camera_make=None,
            camera_model=None,
            software=None,
            datetime_original=None,
            gps_latitude=None,
            gps_longitude=None,
            image_width=None,
            image_height=None,
            color_space=None,
            compression_quality=None,
            steganography_detected=False,
            lsb_anomaly_score=0.0,
            metadata_stripped=True,
            consistency_score=0.5,
            suspicious_flags=[f"Metadata extraction failed: {str(e)}"]
        )
