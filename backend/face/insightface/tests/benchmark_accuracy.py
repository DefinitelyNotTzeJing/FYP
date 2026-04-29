"""
Face Recognition Accuracy Benchmark
====================================
Tests the InsightFace embedding model directly (no HTTP) against the LFW dataset.

Metrics produced:
  - TAR @ FAR=1%, 0.1%, 0.01%  (True Accept Rate at fixed False Accept Rate)
  - FAR / FRR curve
  - EER  (Equal Error Rate — where FAR == FRR)
  - AUC  (Area Under the ROC curve)
  - Accuracy, Precision, Recall, F1 at the current production threshold (0.6)
  - ROC and score-distribution plots saved to tests/results/

Usage
-----
1. Download LFW: http://vis-www.cs.umass.edu/lfw/lfw-deepfunneled.tgz
   Extract so that images live at:
       tests/data/lfw/<Person_Name>/<Person_Name>_0001.jpg  ...

2. Download the standard pairs file:
       http://vis-www.cs.umass.edu/lfw/pairs.txt
   Save it as: tests/data/pairs.txt

3. Activate the project venv, then run:
       python tests/benchmark_accuracy.py
   Optional flags:
       --pairs   tests/data/pairs.txt        (default)
       --images  tests/data/lfw              (default)
       --thresh  0.6                         (production threshold, default)
       --limit   0                           (0 = use all pairs)
       --workers 4                           (parallel embedding workers)
"""

import argparse
import csv
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import cv2
import numpy as np

# ── Results directory ──────────────────────────────────────────────────────────

RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# ── InsightFace setup ──────────────────────────────────────────────────────────

try:
    from insightface.app import FaceAnalysis
except ImportError:
    sys.exit("insightface is not installed. Run: pip install insightface onnxruntime")

_face_app = None


def get_face_app():
    global _face_app
    if _face_app is None:
        _face_app = FaceAnalysis(providers=["CPUExecutionProvider"])
        _face_app.prepare(ctx_id=0, det_size=(320, 320))
    return _face_app


# ── Core helpers ───────────────────────────────────────────────────────────────

def extract_embedding_from_path(image_path: str):
    """Return 512-d embedding or None if no face detected."""
    img = cv2.imread(image_path)
    if img is None:
        return None
    app = get_face_app()
    faces = app.get(img)
    if not faces:
        return None
    # Pick the largest detected face
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return face.embedding if face.embedding is not None else None


def cosine_similarity(a, b):
    a, b = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0


# ── LFW pairs loading ──────────────────────────────────────────────────────────

def load_lfw_pairs(pairs_file: str, images_dir: str, limit: int = 0):
    """
    Parse LFW pairs.txt format.
    Returns list of (path1, path2, is_genuine: bool).
    """
    pairs = []
    with open(pairs_file, "r") as f:
        reader = csv.reader(f, delimiter="\t")
        header = next(reader)            # e.g. "10\t300"
        n_folds, n_pairs_per_fold = int(header[0]), int(header[1])

        for row in reader:
            row = [r.strip() for r in row if r.strip()]
            if len(row) == 3:
                # Genuine pair: name, img_idx1, img_idx2
                name, idx1, idx2 = row
                p1 = _lfw_path(images_dir, name, int(idx1))
                p2 = _lfw_path(images_dir, name, int(idx2))
                pairs.append((p1, p2, True))
            elif len(row) == 4:
                # Impostor pair: name1, img_idx1, name2, img_idx2
                name1, idx1, name2, idx2 = row
                p1 = _lfw_path(images_dir, name1, int(idx1))
                p2 = _lfw_path(images_dir, name2, int(idx2))
                pairs.append((p1, p2, False))

    if limit and limit > 0:
        pairs = pairs[:limit]

    print(f"Loaded {len(pairs)} pairs  "
          f"({sum(1 for _, _, g in pairs if g)} genuine, "
          f"{sum(1 for _, _, g in pairs if not g)} impostor)")
    return pairs


def _lfw_path(images_dir: str, name: str, idx: int) -> str:
    return os.path.join(images_dir, name, f"{name}_{idx:04d}.jpg")


# ── Embedding cache ────────────────────────────────────────────────────────────

def build_embedding_cache(pairs, workers: int = 4):
    """
    Extract embeddings for every unique image path in the pair list.
    Uses a thread pool for parallel I/O + inference.
    Returns dict: path -> embedding (or None).
    """
    unique_paths = list({p for p1, p2, _ in pairs for p in (p1, p2)})
    cache = {}
    failed = 0

    print(f"\nExtracting embeddings for {len(unique_paths)} unique images "
          f"using {workers} workers...")

    start = time.time()
    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_path = {executor.submit(extract_embedding_from_path, p): p
                          for p in unique_paths}
        for i, future in enumerate(as_completed(future_to_path), 1):
            path = future_to_path[future]
            emb = future.result()
            cache[path] = emb
            if emb is None:
                failed += 1
            if i % 200 == 0 or i == len(unique_paths):
                elapsed = time.time() - start
                print(f"  {i}/{len(unique_paths)}  "
                      f"({elapsed:.1f}s elapsed, {failed} no-face)")

    print(f"Done. {failed} images had no detectable face.")
    return cache


# ── Score computation ──────────────────────────────────────────────────────────

def compute_scores(pairs, cache):
    """
    For each pair compute cosine similarity.
    Returns:
        genuine_scores  — list of floats (same-person pairs)
        impostor_scores — list of floats (different-person pairs)
        skipped         — pairs where one or both embeddings are None
    """
    genuine_scores, impostor_scores = [], []
    skipped = 0

    for p1, p2, is_genuine in pairs:
        e1 = cache.get(p1)
        e2 = cache.get(p2)
        if e1 is None or e2 is None:
            skipped += 1
            continue
        sim = cosine_similarity(e1, e2)
        (genuine_scores if is_genuine else impostor_scores).append(sim)

    print(f"\nScored {len(genuine_scores) + len(impostor_scores)} pairs "
          f"({skipped} skipped — no face detected)")
    return genuine_scores, impostor_scores


# ── Metrics ────────────────────────────────────────────────────────────────────

def compute_metrics(genuine_scores, impostor_scores, threshold: float):
    """
    Returns dict of metrics at the given threshold.
    Convention: predict "same person" when similarity >= threshold.
    """
    g = np.array(genuine_scores)
    i = np.array(impostor_scores)

    tp = int(np.sum(g >= threshold))   # genuine pair accepted  ✓
    fn = int(np.sum(g < threshold))    # genuine pair rejected  ✗  (FRR)
    fp = int(np.sum(i >= threshold))   # impostor pair accepted ✗  (FAR)
    tn = int(np.sum(i < threshold))    # impostor pair rejected ✓

    tar = tp / (tp + fn) if (tp + fn) else 0.0   # True Accept Rate = 1 - FRR
    far = fp / (fp + tn) if (fp + tn) else 0.0   # False Accept Rate
    frr = fn / (tp + fn) if (tp + fn) else 0.0   # False Reject Rate
    acc = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) else 0.0
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    f1   = (2 * prec * tar) / (prec + tar) if (prec + tar) else 0.0

    return dict(threshold=threshold, TP=tp, FP=fp, TN=tn, FN=fn,
                TAR=tar, FAR=far, FRR=frr, accuracy=acc,
                precision=prec, recall=tar, F1=f1)


def compute_eer(genuine_scores, impostor_scores):
    """Find threshold where FAR ≈ FRR (Equal Error Rate)."""
    g = np.array(genuine_scores)
    i = np.array(impostor_scores)
    thresholds = np.linspace(0.0, 1.0, 1000)
    best_eer, best_thresh = 1.0, 0.5

    for t in thresholds:
        frr = float(np.mean(g < t))
        far = float(np.mean(i >= t))
        eer = (frr + far) / 2
        if abs(frr - far) < abs(best_eer - 0.5) or eer < best_eer:
            best_eer = eer
            best_thresh = t

    return best_eer, best_thresh


def compute_tar_at_far(genuine_scores, impostor_scores, target_far: float):
    """Return TAR at a fixed FAR operating point."""
    g = np.array(genuine_scores)
    i = np.array(impostor_scores)
    thresholds = np.linspace(0.0, 1.0, 10000)

    best_tar, best_thresh = 0.0, 0.0
    for t in reversed(thresholds):   # sweep from tight to loose
        far = float(np.mean(i >= t))
        if far <= target_far:
            tar = float(np.mean(g >= t))
            best_tar, best_thresh = tar, t
            break
    return best_tar, best_thresh


def compute_roc(genuine_scores, impostor_scores):
    """Return (fpr_array, tpr_array) for ROC plot."""
    g = np.array(genuine_scores)
    i = np.array(impostor_scores)
    thresholds = np.linspace(0.0, 1.0, 500)
    fprs, tprs = [], []
    for t in thresholds:
        fprs.append(float(np.mean(i >= t)))
        tprs.append(float(np.mean(g >= t)))
    return np.array(fprs), np.array(tprs)


def compute_auc(fpr, tpr):
    """Trapezoidal AUC from raw ROC arrays."""
    sorted_idx = np.argsort(fpr)
    return float(np.trapz(tpr[sorted_idx], fpr[sorted_idx]))


# ── Plotting ───────────────────────────────────────────────────────────────────

def save_plots(genuine_scores, impostor_scores, fpr, tpr, auc,
               eer, eer_thresh, prod_thresh, results_dir: Path):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib not installed — skipping plots (pip install matplotlib)")
        return

    # 1. Score distribution
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.hist(impostor_scores, bins=80, alpha=0.6, color="#e74c3c", label="Impostor (different person)")
    ax.hist(genuine_scores,  bins=80, alpha=0.6, color="#2ecc71", label="Genuine (same person)")
    ax.axvline(prod_thresh, color="#2c3e50", lw=2, ls="--", label=f"Production threshold ({prod_thresh})")
    ax.axvline(eer_thresh,  color="#8e44ad", lw=1.5, ls=":",  label=f"EER threshold ({eer_thresh:.3f})")
    ax.set_xlabel("Cosine Similarity")
    ax.set_ylabel("Count")
    ax.set_title("Genuine vs Impostor Score Distribution")
    ax.legend()
    fig.tight_layout()
    fig.savefig(results_dir / "score_distribution.png", dpi=150)
    plt.close(fig)

    # 2. ROC curve
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(fpr, tpr, color="#2980b9", lw=2, label=f"ROC (AUC = {auc:.4f})")
    ax.plot([0, 1], [0, 1], "k--", lw=0.8, label="Random baseline")
    ax.scatter([eer], [1 - eer], color="#e74c3c", zorder=5, s=80, label=f"EER = {eer:.4f}")
    ax.set_xlabel("False Accept Rate (FAR)")
    ax.set_ylabel("True Accept Rate (TAR)")
    ax.set_title("ROC Curve — Face Recognition")
    ax.legend()
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1])
    fig.tight_layout()
    fig.savefig(results_dir / "roc_curve.png", dpi=150)
    plt.close(fig)

    # 3. FAR / FRR vs threshold
    thresholds = np.linspace(0.0, 1.0, 500)
    g, i_ = np.array(genuine_scores), np.array(impostor_scores)
    frrs = [float(np.mean(g < t)) for t in thresholds]
    fars = [float(np.mean(i_ >= t)) for t in thresholds]

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.plot(thresholds, fars,  color="#e74c3c", lw=2, label="FAR (False Accept Rate)")
    ax.plot(thresholds, frrs,  color="#2ecc71", lw=2, label="FRR (False Reject Rate)")
    ax.axvline(prod_thresh, color="#2c3e50", lw=2,   ls="--", label=f"Production ({prod_thresh})")
    ax.axvline(eer_thresh,  color="#8e44ad", lw=1.5, ls=":",  label=f"EER ({eer_thresh:.3f})")
    ax.set_xlabel("Threshold")
    ax.set_ylabel("Error Rate")
    ax.set_title("FAR and FRR vs Decision Threshold")
    ax.legend()
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1])
    fig.tight_layout()
    fig.savefig(results_dir / "far_frr_curve.png", dpi=150)
    plt.close(fig)

    print(f"\nPlots saved to: {results_dir}/")


# ── Report ─────────────────────────────────────────────────────────────────────

def print_report(metrics, eer, eer_thresh, tar_at_far_table, auc, n_genuine, n_impostor):
    sep = "=" * 60
    print(f"\n{sep}")
    print("  FACE RECOGNITION ACCURACY REPORT")
    print(sep)
    print(f"  Genuine pairs evaluated : {n_genuine}")
    print(f"  Impostor pairs evaluated: {n_impostor}")
    print(f"  Production threshold    : {metrics['threshold']}")
    print()

    print("  ── At production threshold ───────────────────────────")
    print(f"  Accuracy  : {metrics['accuracy']:.4f}  ({metrics['accuracy']*100:.2f}%)")
    print(f"  Precision : {metrics['precision']:.4f}")
    print(f"  Recall    : {metrics['recall']:.4f}    (TAR / 1-FRR)")
    print(f"  F1 Score  : {metrics['F1']:.4f}")
    print(f"  FAR       : {metrics['FAR']:.4f}  ({metrics['FAR']*100:.2f}%)")
    print(f"  FRR       : {metrics['FRR']:.4f}  ({metrics['FRR']*100:.2f}%)")
    print(f"  TP={metrics['TP']}  FP={metrics['FP']}  TN={metrics['TN']}  FN={metrics['FN']}")
    print()

    print("  ── TAR at fixed FAR ──────────────────────────────────")
    for target_far, (tar, thresh) in tar_at_far_table.items():
        print(f"  TAR @ FAR={target_far*100:.1f}% : {tar:.4f}  (threshold={thresh:.4f})")
    print()

    print("  ── Global metrics ────────────────────────────────────")
    print(f"  EER        : {eer:.4f}  ({eer*100:.2f}%)  @ threshold={eer_thresh:.4f}")
    print(f"  AUC (ROC)  : {auc:.4f}")
    print()
    print(f"  Interpretation guide:")
    print(f"    EER < 5%   → production-quality recognition")
    print(f"    EER < 1%   → research-grade / high-security")
    print(f"    AUC > 0.99 → excellent discrimination")
    print(sep)


def save_csv_report(metrics, eer, eer_thresh, tar_at_far_table, auc,
                    n_genuine, n_impostor, results_dir: Path):
    out = results_dir / "accuracy_report.csv"
    rows = [
        ("metric", "value"),
        ("genuine_pairs", n_genuine),
        ("impostor_pairs", n_impostor),
        ("production_threshold", metrics["threshold"]),
        ("accuracy", round(metrics["accuracy"], 6)),
        ("precision", round(metrics["precision"], 6)),
        ("recall_TAR", round(metrics["recall"], 6)),
        ("F1", round(metrics["F1"], 6)),
        ("FAR_at_prod_thresh", round(metrics["FAR"], 6)),
        ("FRR_at_prod_thresh", round(metrics["FRR"], 6)),
        ("TP", metrics["TP"]),
        ("FP", metrics["FP"]),
        ("TN", metrics["TN"]),
        ("FN", metrics["FN"]),
        ("EER", round(eer, 6)),
        ("EER_threshold", round(eer_thresh, 6)),
        ("AUC_ROC", round(auc, 6)),
    ]
    for far_level, (tar, thresh) in tar_at_far_table.items():
        rows.append((f"TAR_at_FAR_{far_level}", round(tar, 6)))
        rows.append((f"threshold_at_FAR_{far_level}", round(thresh, 6)))

    with open(out, "w", newline="") as f:
        csv.writer(f).writerows(rows)
    print(f"CSV report saved to: {out}")


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="LFW accuracy benchmark for InsightFace service")
    parser.add_argument("--pairs",   default="tests/data/pairs.txt",
                        help="Path to LFW pairs.txt")
    parser.add_argument("--images",  default="tests/data/lfw",
                        help="Path to LFW image directory")
    parser.add_argument("--thresh",  type=float, default=0.6,
                        help="Production similarity threshold (default 0.6)")
    parser.add_argument("--limit",   type=int,   default=0,
                        help="Limit number of pairs (0 = all)")
    parser.add_argument("--workers", type=int,   default=4,
                        help="Number of parallel embedding workers")
    args = parser.parse_args()

    if not os.path.exists(args.pairs):
        sys.exit(f"pairs.txt not found at: {args.pairs}\n"
                 "Download from: http://vis-www.cs.umass.edu/lfw/pairs.txt")
    if not os.path.isdir(args.images):
        sys.exit(f"LFW image directory not found at: {args.images}\n"
                 "Download from: http://vis-www.cs.umass.edu/lfw/lfw-deepfunneled.tgz")

    pairs          = load_lfw_pairs(args.pairs, args.images, args.limit)
    cache          = build_embedding_cache(pairs, workers=args.workers)
    g_scores, i_scores = compute_scores(pairs, cache)

    if not g_scores or not i_scores:
        sys.exit("Not enough scores computed. Check dataset paths.")

    metrics        = compute_metrics(g_scores, i_scores, args.thresh)
    eer, eer_thresh = compute_eer(g_scores, i_scores)

    far_targets     = {0.01: None, 0.001: None, 0.0001: None}
    tar_at_far_table = {}
    for far_level in far_targets:
        tar, thresh = compute_tar_at_far(g_scores, i_scores, far_level)
        tar_at_far_table[far_level] = (tar, thresh)

    fpr, tpr = compute_roc(g_scores, i_scores)
    auc      = compute_auc(fpr, tpr)

    print_report(metrics, eer, eer_thresh, tar_at_far_table, auc,
                 len(g_scores), len(i_scores))
    save_csv_report(metrics, eer, eer_thresh, tar_at_far_table, auc,
                    len(g_scores), len(i_scores), RESULTS_DIR)
    save_plots(g_scores, i_scores, fpr, tpr, auc,
               eer, eer_thresh, args.thresh, RESULTS_DIR)


if __name__ == "__main__":
    main()
