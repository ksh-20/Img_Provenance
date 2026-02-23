"""
Perceptual hashing service for near-duplicate image detection.
Supports pHash, dHash, aHash, and wHash via the imagehash library.
"""

import imagehash
from PIL import Image
from typing import Dict, Tuple


def compute_hashes(image_path: str) -> Dict[str, str]:
    """Compute perceptual hashes for an image."""
    try:
        img = Image.open(image_path).convert("RGB")
        return {
            "phash": str(imagehash.phash(img)),
            "dhash": str(imagehash.dhash(img)),
            "ahash": str(imagehash.average_hash(img)),
            "whash": str(imagehash.whash(img)),
        }
    except Exception as e:
        return {
            "phash": "0" * 16,
            "dhash": "0" * 16,
            "ahash": "0" * 16,
            "whash": "0" * 16,
        }


def hamming_distance(hash1: str, hash2: str) -> int:
    """Compute Hamming distance between two hash strings."""
    try:
        h1 = imagehash.hex_to_hash(hash1)
        h2 = imagehash.hex_to_hash(hash2)
        return h1 - h2
    except Exception:
        return 64  # max distance = completely different


def similarity_from_hashes(hash1: str, hash2: str) -> float:
    """Convert Hamming distance to similarity score [0, 1]."""
    dist = hamming_distance(hash1, hash2)
    max_dist = 64  # bits in hash
    return round(1.0 - (dist / max_dist), 4)


def are_near_duplicates(hash1: str, hash2: str, threshold: int = 10) -> bool:
    """Return True if two images are near-duplicates (Hamming < threshold)."""
    return hamming_distance(hash1, hash2) < threshold


def compare_all_hashes(hashes_a: Dict[str, str], hashes_b: Dict[str, str]) -> Dict[str, float]:
    """
    Compare two sets of hashes, returns similarity for each hash type.
    """
    result = {}
    for key in ["phash", "dhash", "ahash", "whash"]:
        if key in hashes_a and key in hashes_b:
            result[key] = similarity_from_hashes(hashes_a[key], hashes_b[key])
    # Composite similarity (weighted)
    weights = {"phash": 0.4, "dhash": 0.3, "ahash": 0.2, "whash": 0.1}
    composite = sum(result.get(k, 0) * w for k, w in weights.items())
    result["composite"] = round(composite, 4)
    return result
