import cv2
import numpy as np
import json
import base64
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
from insightface.app import FaceAnalysis
from collections import deque

app_flask = Flask(__name__)
CORS(app_flask)

face_app = FaceAnalysis(providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(320, 320))

SIMILARITY_THRESHOLD = 0.6
POSE_THRESHOLD = 5  # degrees — same as your test1.py

# ── Helpers ───────────────────────────────────────────────────────────────────

def decode_frame(b64_string):
    try:
        if ',' in b64_string:
            b64_string = b64_string.split(',')[1]
        img_bytes = base64.b64decode(b64_string)
        arr = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None

def get_largest_face(faces):
    if not faces:
        return None
    return max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0

# ── Passive liveness (same logic as your PassiveLivenessDetector) ─────────────

def passive_liveness_check(frames_b64):
    positions = deque(maxlen=20)
    texture_scores = deque(maxlen=10)
    best_face = None
    best_frame_b64 = None

    for b64 in frames_b64:
        frame = decode_frame(b64)
        if frame is None:
            continue
        faces = face_app.get(frame)
        face = get_largest_face(faces)
        if face is None:
            continue

        box = face.bbox.astype(int)
        center = ((box[0]+box[2])//2, (box[1]+box[3])//2)
        positions.append(center)

        face_region = frame[box[1]:box[3], box[0]:box[2]]
        if face_region.size > 0:
            gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
            texture = cv2.Laplacian(gray, cv2.CV_64F).var()
            texture_scores.append(texture)

        best_face = face
        best_frame_b64 = b64

    if len(texture_scores) < 5:
        return 0, "Not enough face data", best_face, best_frame_b64

    avg_texture = float(np.mean(texture_scores))
    texture_pass = avg_texture > 40

    movement_score = 0
    movement_type = "unknown"
    if len(positions) >= 10:
        pos_arr = np.array(positions)
        total_movement = float(np.var(pos_arr[:,0]) + np.var(pos_arr[:,1]))
        if total_movement < 2:
            movement_type = f"STATIC({total_movement:.1f})"
            movement_score = 0
        elif total_movement <= 50:
            movement_type = f"Natural({total_movement:.1f})"
            movement_score = 50
        elif total_movement <= 200:
            movement_type = f"Active({total_movement:.1f})"
            movement_score = 30
        else:
            movement_type = f"Excessive({total_movement:.1f})"
            movement_score = 10

    score = (30 if texture_pass else 0) + movement_score
    detail = f"Texture: {'OK' if texture_pass else f'Low({avg_texture:.0f})'} | Movement: {movement_type}"
    return score, detail, best_face, best_frame_b64

# ── Active liveness: head pose (from your working test1.py logic) ─────────────

def active_liveness_check(frames_b64, challenge_type):
    poses = []
    for b64 in frames_b64:
        frame = decode_frame(b64)
        if frame is None:
            continue
        faces = face_app.get(frame)
        face = get_largest_face(faces)
        if face is None:
            continue
        if hasattr(face, 'pose') and face.pose is not None:
            poses.append({'yaw': float(face.pose[0]), 'pitch': float(face.pose[1])})

    print(f"[Active] challenge={challenge_type} frames={len(poses)}")

    if len(poses) < 5:
        return False, f"Not enough pose data ({len(poses)} frames)"

    yaws   = [p['yaw']   for p in poses]
    pitches = [p['pitch'] for p in poses]

    if challenge_type == 'turn_left':
        val = min(yaws)
        passed = val < -POSE_THRESHOLD
        return passed, f"Min yaw={val:.1f}° (need <-{POSE_THRESHOLD}°)"

    elif challenge_type == 'turn_right':
        val = max(yaws)
        passed = val > POSE_THRESHOLD
        return passed, f"Max yaw={val:.1f}° (need >{POSE_THRESHOLD}°)"

    elif challenge_type == 'look_up':
        val = min(pitches)
        passed = val < -POSE_THRESHOLD
        return passed, f"Min pitch={val:.1f}° (need <-{POSE_THRESHOLD}°)"

    elif challenge_type == 'look_down':
        val = max(pitches)
        passed = val > POSE_THRESHOLD
        return passed, f"Max pitch={val:.1f}° (need >{POSE_THRESHOLD}°)"

    return False, f"Unknown challenge type: {challenge_type}"

# ── Embedding extraction ──────────────────────────────────────────────────────

def extract_embedding(frame_b64):
    frame = decode_frame(frame_b64)
    if frame is None:
        return None
    faces = face_app.get(frame)
    face = get_largest_face(faces)
    if face is None or face.embedding is None:
        return None
    return face.embedding.tolist()

# ── Routes ────────────────────────────────────────────────────────────────────

@app_flask.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'face-liveness'})

@app_flask.route('/register', methods=['POST'])
def register():
    """
    Expects: { frames: [base64, ...] }
    Returns: { success, embedding }
    """
    data = request.get_json()
    frames_b64 = data.get('frames', [])

    if len(frames_b64) < 5:
        return jsonify({'success': False, 'message': 'Not enough frames'}), 400

    # Passive check
    passive_score, passive_detail, best_face, best_frame_b64 = passive_liveness_check(frames_b64)
    print(f"[Register] Passive: {passive_score}% — {passive_detail}")

    if passive_score < 20:
        return jsonify({'success': False, 'message': f'Liveness check failed: {passive_detail}'}), 401

    # Extract embedding from best frame
    if best_face is None or best_face.embedding is None:
        return jsonify({'success': False, 'message': 'Could not extract face embedding'}), 400

    embedding = best_face.embedding.tolist()
    return jsonify({'success': True, 'embedding': embedding})


@app_flask.route('/verify', methods=['POST'])
def verify():
    """
    Expects: { frames: [base64, ...], stored_embedding: [...], challenge_type?: string }
    Returns: { success, liveness, match, similarity }
    """
    data = request.get_json()
    frames_b64       = data.get('frames', [])
    stored_embedding = data.get('stored_embedding')
    challenge_type   = data.get('challenge_type')  # optional

    if not frames_b64 or not stored_embedding:
        return jsonify({'success': False, 'message': 'Missing frames or stored_embedding'}), 400

    # Passive check
    passive_score, passive_detail, best_face, best_frame_b64 = passive_liveness_check(frames_b64)
    print(f"[Verify] Passive: {passive_score}% — {passive_detail}")

    # Active check if challenge_type provided
    if challenge_type:
        active_passed, active_detail = active_liveness_check(frames_b64, challenge_type)
        print(f"[Verify] Active ({challenge_type}): {'PASS' if active_passed else 'FAIL'} — {active_detail}")
        if not active_passed:
            return jsonify({
                'success': False,
                'liveness': False,
                'message': f'Liveness challenge failed: {active_detail}'
            }), 401
    else:
        # No challenge — require higher passive score
        if passive_score < 20:
            return jsonify({
                'success': False,
                'liveness': False,
                'message': f'Liveness check failed: {passive_detail}'
            }), 401

    # Face match
    if best_face is None or best_face.embedding is None:
        return jsonify({'success': False, 'message': 'Could not extract face embedding'}), 400

    similarity = cosine_similarity(best_face.embedding, stored_embedding)
    print(f"[Verify] Similarity: {similarity:.4f}")

    if similarity >= SIMILARITY_THRESHOLD:
        return jsonify({'success': True, 'liveness': True, 'match': True, 'similarity': similarity})
    else:
        return jsonify({
            'success': False,
            'liveness': True,
            'match': False,
            'similarity': similarity,
            'message': 'Face does not match registered user'
        }), 401


@app_flask.route('/check-pose', methods=['POST'])
def check_pose():
    """
    Real-time pose check during capture.
    Expects: { frame: base64 }
    Returns: { yaw, pitch, has_pose }
    """
    data = request.get_json()
    frame_b64 = data.get('frame')
    if not frame_b64:
        return jsonify({'has_pose': False}), 400

    frame = decode_frame(frame_b64)
    if frame is None:
        return jsonify({'has_pose': False})

    faces = face_app.get(frame)
    face = get_largest_face(faces)
    if face is None:
        return jsonify({'has_pose': False, 'message': 'No face detected'})

    if hasattr(face, 'pose') and face.pose is not None:
        yaw   = float(face.pose[0])
        pitch = float(face.pose[1])
        return jsonify({'has_pose': True, 'yaw': round(yaw, 2), 'pitch': round(pitch, 2)})

    return jsonify({'has_pose': False, 'message': 'No pose data'})


if __name__ == '__main__':
    print("Starting Face Liveness Service on port 5000...")
    app_flask.run(host='0.0.0.0', port=5000, debug=False)