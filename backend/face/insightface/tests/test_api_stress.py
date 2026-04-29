"""
API Stress & Load Test
========================
Fires concurrent requests at the running Flask face service (port 5000)
to measure throughput, latency, and error rate under load.

The test uses a single reference image (or synthetic data) — it does NOT
need a real dataset; its goal is performance, not accuracy.

Prerequisites
-------------
  pip install requests httpx

Start the service first:
    cd backend/face/insightface
    python face_liveness_service.py

Then in another terminal:
    python tests/test_api_stress.py
    python tests/test_api_stress.py --workers 10 --requests 200 --image path/to/face.jpg
"""

import argparse
import base64
import json
import os
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("requests not installed — run: pip install requests")

BASE_URL = "http://127.0.0.1:5000"
RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_synthetic_b64_frame(width=160, height=120):
    """Create a tiny solid-colour JPEG as a stand-in frame (no real face)."""
    import cv2
    import numpy as np
    img = np.ones((height, width, 3), dtype=np.uint8) * 128
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 50])
    return base64.b64encode(buf).decode("utf-8")


def load_image_as_b64(path: str):
    import cv2
    img = cv2.imread(path)
    if img is None:
        return None
    _, buf = cv2.imencode(".jpg", img)
    return base64.b64encode(buf).decode("utf-8")


def make_fake_embedding(dim=512):
    import numpy as np
    v = np.random.randn(dim).astype(np.float32)
    v /= np.linalg.norm(v)
    return v.tolist()


# ── Single-request wrappers ────────────────────────────────────────────────────

def request_health(session):
    t0 = time.perf_counter()
    try:
        r = session.get(f"{BASE_URL}/health", timeout=10)
        return r.status_code, time.perf_counter() - t0, None
    except Exception as e:
        return None, time.perf_counter() - t0, str(e)


def request_check_pose(session, frame_b64):
    t0 = time.perf_counter()
    try:
        r = session.post(f"{BASE_URL}/check-pose",
                         json={"frame": frame_b64}, timeout=15)
        return r.status_code, time.perf_counter() - t0, None
    except Exception as e:
        return None, time.perf_counter() - t0, str(e)


def request_verify(session, frames_b64, stored_embedding):
    t0 = time.perf_counter()
    try:
        r = session.post(f"{BASE_URL}/verify",
                         json={
                             "frames": frames_b64,
                             "stored_embedding": stored_embedding,
                             "challenge_type": "turn_left",
                         }, timeout=30)
        return r.status_code, time.perf_counter() - t0, None
    except Exception as e:
        return None, time.perf_counter() - t0, str(e)


def request_register(session, frames_b64):
    t0 = time.perf_counter()
    try:
        r = session.post(f"{BASE_URL}/register",
                         json={"frames": frames_b64}, timeout=30)
        return r.status_code, time.perf_counter() - t0, None
    except Exception as e:
        return None, time.perf_counter() - t0, str(e)


# ── Load runner ────────────────────────────────────────────────────────────────

def run_load_test(endpoint_fn, n_requests: int, n_workers: int, label: str):
    """
    Fire n_requests calls to endpoint_fn across n_workers threads.
    Returns stats dict.
    """
    latencies = []
    statuses  = []
    errors    = []

    wall_start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=n_workers) as pool:
        futures = [pool.submit(endpoint_fn) for _ in range(n_requests)]
        for f in as_completed(futures):
            code, latency, err = f.result()
            latencies.append(latency)
            statuses.append(code)
            if err:
                errors.append(err)
    wall_time = time.perf_counter() - wall_start

    ok = [c for c in statuses if c is not None and c < 500]
    return {
        "label":       label,
        "n_requests":  n_requests,
        "n_workers":   n_workers,
        "wall_sec":    round(wall_time, 3),
        "rps":         round(n_requests / wall_time, 2),
        "success_rate": round(len(ok) / n_requests * 100, 1),
        "p50_ms":      round(statistics.median(latencies) * 1000, 1),
        "p95_ms":      round(sorted(latencies)[int(len(latencies) * 0.95)] * 1000, 1),
        "p99_ms":      round(sorted(latencies)[int(len(latencies) * 0.99)] * 1000, 1),
        "min_ms":      round(min(latencies) * 1000, 1),
        "max_ms":      round(max(latencies) * 1000, 1),
        "errors":      errors[:5],   # first 5 only
    }


# ── Service availability check ─────────────────────────────────────────────────

def wait_for_service(timeout=15):
    print(f"Waiting for face service at {BASE_URL}...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"{BASE_URL}/health", timeout=2)
            if r.status_code == 200:
                print("  Service is UP")
                return True
        except Exception:
            pass
        time.sleep(1)
    print("  Service did NOT respond in time. Start it first.")
    return False


# ── Report ─────────────────────────────────────────────────────────────────────

def print_stats(stats):
    sep = "-" * 55
    print(f"\n  {stats['label']}")
    print(sep)
    print(f"  Requests     : {stats['n_requests']}  Workers: {stats['n_workers']}")
    print(f"  Wall time    : {stats['wall_sec']}s")
    print(f"  Throughput   : {stats['rps']} req/s")
    print(f"  Success rate : {stats['success_rate']}%")
    print(f"  Latency  p50 : {stats['p50_ms']} ms")
    print(f"  Latency  p95 : {stats['p95_ms']} ms")
    print(f"  Latency  p99 : {stats['p99_ms']} ms")
    print(f"  Latency  min : {stats['min_ms']} ms  max: {stats['max_ms']} ms")
    if stats["errors"]:
        print(f"  Errors (sample): {stats['errors']}")


def save_json_report(all_stats, results_dir: Path):
    out = results_dir / "stress_test_report.json"
    with open(out, "w") as f:
        json.dump(all_stats, f, indent=2)
    print(f"\nFull stress-test report saved to: {out}")


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Stress test the face recognition Flask API")
    parser.add_argument("--workers",  type=int, default=5,
                        help="Concurrent worker threads (default 5)")
    parser.add_argument("--requests", type=int, default=100,
                        help="Total requests per endpoint (default 100)")
    parser.add_argument("--image",    default=None,
                        help="Optional real face image for pose/verify tests")
    args = parser.parse_args()

    if not wait_for_service():
        sys.exit(1)

    # Prepare frame data
    if args.image and os.path.exists(args.image):
        b64_frame = load_image_as_b64(args.image)
        print(f"Using real image: {args.image}")
    else:
        b64_frame = make_synthetic_b64_frame()
        print("Using synthetic (blank) frame — face detection will fail gracefully")

    frames_10  = [b64_frame] * 10
    fake_emb   = make_fake_embedding()
    session    = requests.Session()

    print(f"\n{'='*55}")
    print(f"  STRESS TEST  —  {args.requests} requests, {args.workers} workers")
    print(f"{'='*55}")

    all_stats = []

    # Test 1: Health check (lightweight)
    stats = run_load_test(
        lambda: request_health(session),
        n_requests=args.requests,
        n_workers=args.workers,
        label="GET /health",
    )
    print_stats(stats)
    all_stats.append(stats)

    # Test 2: Check pose (single frame decode)
    stats = run_load_test(
        lambda: request_check_pose(session, b64_frame),
        n_requests=args.requests,
        n_workers=args.workers,
        label="POST /check-pose (single frame)",
    )
    print_stats(stats)
    all_stats.append(stats)

    # Test 3: Verify (10 frames + embedding comparison) — most expensive
    stats = run_load_test(
        lambda: request_verify(session, frames_10, fake_emb),
        n_requests=args.requests,
        n_workers=args.workers,
        label="POST /verify (10 frames, cosine match)",
    )
    print_stats(stats)
    all_stats.append(stats)

    # Test 4: Register (10 frames)
    stats = run_load_test(
        lambda: request_register(session, frames_10),
        n_requests=args.requests,
        n_workers=args.workers,
        label="POST /register (10 frames)",
    )
    print_stats(stats)
    all_stats.append(stats)

    # Scalability sweep: increase concurrency for /health
    print(f"\n{'='*55}")
    print("  CONCURRENCY SCALABILITY SWEEP  (GET /health)")
    print(f"{'='*55}")
    sweep_stats = []
    for w in [1, 2, 5, 10, 20]:
        s = run_load_test(
            lambda: request_health(session),
            n_requests=max(args.requests, w * 10),
            n_workers=w,
            label=f"health @ {w} workers",
        )
        sweep_stats.append(s)
        print(f"  workers={w:2d}  rps={s['rps']:7.1f}  "
              f"p50={s['p50_ms']}ms  p99={s['p99_ms']}ms  "
              f"success={s['success_rate']}%")
    all_stats.extend(sweep_stats)

    save_json_report(all_stats, RESULTS_DIR)

    # Exit non-zero if any test had < 80% success (excluding 4xx which are expected)
    failures = [s for s in all_stats if s["success_rate"] < 80]
    if failures:
        print(f"\n[WARN] {len(failures)} test(s) had < 80% success rate!")
        sys.exit(1)
    print("\nAll stress tests completed successfully.")


if __name__ == "__main__":
    main()
