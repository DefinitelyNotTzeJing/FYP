"""
Dataset Preparation Helper
===========================
Downloads and extracts the LFW (Labeled Faces in the Wild) dataset
so that benchmark_accuracy.py can run immediately.

Also creates a small synthetic dataset from your own webcam for
quick smoke-tests (no download required).

Usage
-----
  # Download LFW deep-funneled + pairs:
  python tests/prepare_dataset.py --download-lfw

  # Capture synthetic test images from your webcam:
  python tests/prepare_dataset.py --capture-webcam --person YourName --count 20

  # Build a spoof dataset by screenshotting photos on screen:
  python tests/prepare_dataset.py --capture-spoof --count 10
"""

import argparse
import os
import sys
import time
import base64
import shutil
import tarfile
import urllib.request
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
LFW_DIR  = DATA_DIR / "lfw"
LIVENESS_DIR = DATA_DIR / "liveness"

LFW_URL      = "http://vis-www.cs.umass.edu/lfw/lfw-deepfunneled.tgz"
LFW_PAIRS_URL = "http://vis-www.cs.umass.edu/lfw/pairs.txt"


# ── Download LFW ───────────────────────────────────────────────────────────────

def download_lfw():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Download pairs.txt
    pairs_dest = DATA_DIR / "pairs.txt"
    if not pairs_dest.exists():
        print(f"Downloading pairs.txt from {LFW_PAIRS_URL} ...")
        urllib.request.urlretrieve(LFW_PAIRS_URL, pairs_dest)
        print(f"  Saved to: {pairs_dest}")
    else:
        print(f"pairs.txt already exists: {pairs_dest}")

    # Download archive
    tgz_dest = DATA_DIR / "lfw-deepfunneled.tgz"
    if not tgz_dest.exists():
        print(f"\nDownloading LFW-deepfunneled (~230 MB) from:\n  {LFW_URL}")
        print("This may take several minutes on a slow connection...")

        def progress(block, block_size, total):
            downloaded = block * block_size
            pct = min(downloaded / total * 100, 100) if total > 0 else 0
            print(f"\r  {pct:.1f}%  ({downloaded // 1_000_000}MB / {total // 1_000_000}MB)",
                  end="", flush=True)

        urllib.request.urlretrieve(LFW_URL, tgz_dest, reporthook=progress)
        print()
    else:
        print(f"\nArchive already exists: {tgz_dest}")

    # Extract
    if not LFW_DIR.exists():
        print(f"\nExtracting to {DATA_DIR} ...")
        with tarfile.open(tgz_dest, "r:gz") as tar:
            tar.extractall(DATA_DIR)
        # The archive unpacks to lfw-deepfunneled/ — rename to lfw/
        extracted = DATA_DIR / "lfw-deepfunneled"
        if extracted.exists():
            extracted.rename(LFW_DIR)
        print(f"  Extracted to: {LFW_DIR}")
    else:
        print(f"LFW directory already exists: {LFW_DIR}")

    # Count images
    n = sum(1 for _ in LFW_DIR.rglob("*.jpg"))
    print(f"\nReady. {n:,} images in {LFW_DIR}")
    print("\nRun the benchmark with:")
    print("  python tests/benchmark_accuracy.py")


# ── Webcam capture ─────────────────────────────────────────────────────────────

def capture_from_webcam(person_name: str, count: int, is_spoof: bool):
    try:
        import cv2
    except ImportError:
        sys.exit("opencv-python not installed — run: pip install opencv-python")

    category = "spoof" if is_spoof else "real"
    if is_spoof:
        out_dir = LIVENESS_DIR / "spoof"
    else:
        out_dir = LIVENESS_DIR / "real" / person_name

    out_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        sys.exit("Cannot open webcam (camera index 0)")

    print(f"\nCapturing {count} frames → {out_dir}")
    print("Press SPACE to capture a frame, Q to quit early.\n")
    if is_spoof:
        print("  Hold a printed photo or show a screen in front of the camera.")
    else:
        print("  Look directly at the camera (real face).")

    saved = 0
    while saved < count:
        ret, frame = cap.read()
        if not ret:
            break
        preview = frame.copy()
        cv2.putText(preview, f"Saved: {saved}/{count} — SPACE=capture, Q=quit",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.imshow("Capture", preview)

        key = cv2.waitKey(1) & 0xFF
        if key == ord(' '):
            fname = out_dir / f"{person_name}_{saved+1:04d}.jpg"
            cv2.imwrite(str(fname), frame)
            print(f"  Saved: {fname}")
            saved += 1
            time.sleep(0.2)
        elif key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"\nDone. {saved} frames saved to: {out_dir}")
    print("\nRun liveness tests with:")
    print("  python tests/test_liveness_accuracy.py")


# ── Synthetic dataset creation (no camera needed) ──────────────────────────────

def create_synthetic_pairs(n_persons: int = 10, images_per_person: int = 5):
    """
    Generate a minimal test dataset of solid-colour images for smoke-testing
    benchmark_accuracy.py without downloading LFW.  These images have no real
    faces so the embedding extraction will return None for all — the test will
    report '0 pairs scored' but verifies the pipeline runs without crashing.
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        sys.exit("opencv-python is required: pip install opencv-python")

    out = DATA_DIR / "synthetic_faces"
    out.mkdir(parents=True, exist_ok=True)

    print(f"Creating synthetic dataset: {n_persons} persons × {images_per_person} images")
    for p in range(n_persons):
        person_dir = out / f"Person_{p+1:03d}"
        person_dir.mkdir(exist_ok=True)
        color = (p * 25 % 256, p * 50 % 256, p * 75 % 256)
        for i in range(images_per_person):
            img = np.full((112, 112, 3), color, dtype=np.uint8)
            path = person_dir / f"Person_{p+1:03d}_{i+1:04d}.jpg"
            cv2.imwrite(str(path), img)

    # Write a minimal pairs.txt
    pairs_out = DATA_DIR / "synthetic_pairs.txt"
    with open(pairs_out, "w") as f:
        # Header: folds, pairs per fold
        f.write(f"1\t{n_persons * 2}\n")
        # Genuine pairs (same person, different image)
        for p in range(1, n_persons + 1):
            f.write(f"Person_{p:03d}\t1\t2\n")
        # Impostor pairs (different persons)
        for p in range(1, n_persons):
            f.write(f"Person_{p:03d}\t1\tPerson_{p+1:03d}\t1\n")

    print(f"\nSynthetic dataset ready:")
    print(f"  Images : {out}")
    print(f"  Pairs  : {pairs_out}")
    print("\nRun benchmark (will score 0 pairs — no real faces, validates pipeline):")
    print(f"  python tests/benchmark_accuracy.py --images {out} --pairs {pairs_out}")


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Prepare datasets for face recognition testing")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--download-lfw",    action="store_true",
                       help="Download LFW deep-funneled dataset (~230 MB)")
    group.add_argument("--capture-webcam",  action="store_true",
                       help="Capture real face frames from webcam")
    group.add_argument("--capture-spoof",   action="store_true",
                       help="Capture spoof frames (print/screen attacks)")
    group.add_argument("--synthetic",       action="store_true",
                       help="Create synthetic (no-face) dataset for pipeline smoke test")

    parser.add_argument("--person", default="Person",
                        help="Person name for webcam capture (used as folder name)")
    parser.add_argument("--count",  type=int, default=20,
                        help="Number of frames to capture (default 20)")
    args = parser.parse_args()

    if args.download_lfw:
        download_lfw()
    elif args.capture_webcam:
        capture_from_webcam(args.person, args.count, is_spoof=False)
    elif args.capture_spoof:
        capture_from_webcam(args.person or "spoof", args.count, is_spoof=True)
    elif args.synthetic:
        create_synthetic_pairs()


if __name__ == "__main__":
    main()
