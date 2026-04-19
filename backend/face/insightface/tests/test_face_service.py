"""
Tests for face_liveness_service.py
All heavy dependencies (cv2, insightface) are stubbed before the module is imported,
so the suite runs without a GPU, a camera, or actual ONNX models.
"""

import base64
import importlib
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

import numpy as np

# ── Stub cv2 ──────────────────────────────────────────────────────────────────

_cv2 = types.ModuleType("cv2")
_cv2.IMREAD_COLOR = 1
_cv2.COLOR_BGR2GRAY = 6
_cv2.CV_64F = 6

def _imdecode(arr, flags):
    # Return a tiny 10x10 BGR frame so real logic can run
    return np.zeros((10, 10, 3), dtype=np.uint8)

def _cvtColor(img, code):
    return np.zeros(img.shape[:2], dtype=np.uint8)

class _FakeLaplacian:
    def var(self):
        return 80.0  # above texture threshold (40)

def _Laplacian(gray, ddepth):
    return _FakeLaplacian()

def _flip(frame, flipCode):
    return frame

_cv2.imdecode = _imdecode
_cv2.cvtColor = _cvtColor
_cv2.Laplacian = _Laplacian
_cv2.flip = _flip
sys.modules["cv2"] = _cv2

# ── Stub insightface ──────────────────────────────────────────────────────────

def _make_face(embedding=None, pose=None, bbox=None, det_score=0.99):
    face = MagicMock()
    face.embedding = np.array(embedding) if embedding is not None else np.ones(512)
    face.pose = np.array(pose) if pose is not None else np.array([0.0, 0.0, 0.0])
    face.bbox = np.array(bbox if bbox else [1, 1, 5, 5], dtype=float)
    face.det_score = det_score
    return face

_insightface = types.ModuleType("insightface")
_insightface_app = types.ModuleType("insightface.app")

class _FaceAnalysis:
    def __init__(self, providers=None):
        self._faces = [_make_face()]

    def prepare(self, ctx_id=0, det_size=(320, 320)):
        pass

    def get(self, frame):
        return self._faces

    def set_faces(self, faces):
        self._faces = faces

_insightface_app.FaceAnalysis = _FaceAnalysis
_insightface.app = _insightface_app
sys.modules["insightface"] = _insightface
sys.modules["insightface.app"] = _insightface_app

# ── Import the module under test ──────────────────────────────────────────────

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))
import face_liveness_service as svc

# Expose the FaceAnalysis singleton so individual tests can configure responses
_face_analysis_instance: _FaceAnalysis = svc.face_app


# ─────────────────────────────────────────────────────────────────────────────
# Helper factories
# ─────────────────────────────────────────────────────────────────────────────

def _b64_frame() -> str:
    """Return a minimal valid base64-encoded JPEG-like payload."""
    return base64.b64encode(b"\xff\xd8\xff\xe0" + b"\x00" * 20).decode()


def _b64_data_uri() -> str:
    return "data:image/jpeg;base64," + _b64_frame()


def _frames(n: int = 10) -> list[str]:
    return [_b64_frame() for _ in range(n)]


# ─────────────────────────────────────────────────────────────────────────────
# Unit tests — pure helper functions
# ─────────────────────────────────────────────────────────────────────────────

class TestDecodeFrame(unittest.TestCase):
    def test_plain_base64_returns_array(self):
        result = svc.decode_frame(_b64_frame())
        self.assertIsNotNone(result)
        self.assertIsInstance(result, np.ndarray)

    def test_data_uri_prefix_stripped(self):
        result = svc.decode_frame(_b64_data_uri())
        self.assertIsNotNone(result)

    def test_invalid_base64_returns_none(self):
        result = svc.decode_frame("not-valid-base64!!!")
        self.assertIsNone(result)

    def test_imdecode_failure_returns_none(self):
        with patch.object(_cv2, "imdecode", return_value=None):
            result = svc.decode_frame(_b64_frame())
        self.assertIsNone(result)

    def test_frame_is_flipped(self):
        flipped = MagicMock()
        with patch.object(_cv2, "flip", return_value=flipped) as mock_flip:
            result = svc.decode_frame(_b64_frame())
        mock_flip.assert_called_once()
        self.assertIs(result, flipped)


class TestGetLargestFace(unittest.TestCase):
    def test_returns_none_for_empty_list(self):
        self.assertIsNone(svc.get_largest_face([]))

    def test_returns_none_for_none_input(self):
        self.assertIsNone(svc.get_largest_face(None))

    def test_returns_single_face(self):
        face = _make_face(bbox=[0, 0, 4, 4])
        self.assertIs(svc.get_largest_face([face]), face)

    def test_returns_largest_by_area(self):
        small = _make_face(bbox=[0, 0, 2, 2])   # area = 4
        large = _make_face(bbox=[0, 0, 10, 10])  # area = 100
        self.assertIs(svc.get_largest_face([small, large]), large)
        self.assertIs(svc.get_largest_face([large, small]), large)


class TestCosineSimilarity(unittest.TestCase):
    def test_identical_vectors_return_one(self):
        v = [1.0] * 512
        self.assertAlmostEqual(svc.cosine_similarity(v, v), 1.0, places=5)

    def test_opposite_vectors_return_minus_one(self):
        a = [1.0] * 512
        b = [-1.0] * 512
        self.assertAlmostEqual(svc.cosine_similarity(a, b), -1.0, places=5)

    def test_orthogonal_vectors_return_zero(self):
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        self.assertAlmostEqual(svc.cosine_similarity(a, b), 0.0, places=5)

    def test_zero_vector_returns_zero(self):
        a = [0.0] * 512
        b = [1.0] * 512
        self.assertEqual(svc.cosine_similarity(a, b), 0.0)

    def test_value_in_range(self):
        rng = np.random.default_rng(42)
        a = rng.random(512).tolist()
        b = rng.random(512).tolist()
        result = svc.cosine_similarity(a, b)
        self.assertGreaterEqual(result, -1.0)
        self.assertLessEqual(result, 1.0)


# ─────────────────────────────────────────────────────────────────────────────
# Passive liveness check
# ─────────────────────────────────────────────────────────────────────────────

class TestPassiveLivenessCheck(unittest.TestCase):
    def setUp(self):
        # Default: face_app returns one face with good texture/movement
        _face_analysis_instance.set_faces([_make_face()])

    def test_fewer_than_5_frames_with_faces_returns_zero(self):
        # Only 3 valid frames → texture_scores len < 5 → score 0
        _face_analysis_instance.set_faces([_make_face()])
        score, detail, _, _ = svc.passive_liveness_check(_frames(3))
        self.assertEqual(score, 0)
        self.assertIn("Not enough", detail)

    def test_10_frames_returns_positive_score(self):
        score, detail, best_face, _ = svc.passive_liveness_check(_frames(10))
        self.assertGreater(score, 0)
        self.assertIsNotNone(best_face)

    def test_no_faces_detected_returns_zero(self):
        _face_analysis_instance.set_faces([])
        score, detail, best_face, best_frame = svc.passive_liveness_check(_frames(10))
        self.assertEqual(score, 0)
        self.assertIsNone(best_face)

    def test_texture_score_applied(self):
        # Laplacian.var() returns 80 (> 40 threshold) → texture_pass=True → +30 pts
        score, _, _, _ = svc.passive_liveness_check(_frames(10))
        # score includes 30 for texture
        self.assertGreaterEqual(score, 30)

    def test_low_texture_reduces_score(self):
        class _LowLaplacian:
            def var(self):
                return 10.0  # below threshold

        with patch.object(_cv2, "Laplacian", return_value=_LowLaplacian()):
            score, detail, _, _ = svc.passive_liveness_check(_frames(10))
        self.assertIn("Low", detail)
        # texture part = 0; movement part only
        self.assertLessEqual(score, 50)


# ─────────────────────────────────────────────────────────────────────────────
# Active liveness check
# ─────────────────────────────────────────────────────────────────────────────

class TestActiveLivenessCheck(unittest.TestCase):
    def _faces_with_pose(self, yaws, pitches):
        faces = []
        for y, p in zip(yaws, pitches):
            faces.append(_make_face(pose=[y, p, 0.0]))
        return faces

    def test_fewer_than_5_frames_returns_false(self):
        _face_analysis_instance.set_faces([_make_face(pose=[5.0, 0.0, 0.0])])
        passed, detail = svc.active_liveness_check(_frames(3), "turn_left")
        self.assertFalse(passed)
        self.assertIn("Not enough", detail)

    def test_turn_left_passes_with_sufficient_yaw_deviation(self):
        # Frames alternate 0° and 15° yaw → max deviation = 7.5° > 3°
        faces = [_make_face(pose=[0.0 if i % 2 == 0 else 15.0, 0.0, 0.0]) for i in range(10)]
        _face_analysis_instance.set_faces(faces)

        # We need active_liveness_check to cycle through faces per frame;
        # patch face_app.get to return one face at a time
        call_count = [0]
        def _get_cycling(frame):
            f = faces[call_count[0] % len(faces)]
            call_count[0] += 1
            return [f]

        with patch.object(svc.face_app, "get", side_effect=_get_cycling):
            passed, detail = svc.active_liveness_check(_frames(10), "turn_left")

        self.assertTrue(passed)
        self.assertIn("yaw deviation", detail)

    def test_turn_right_same_logic_as_turn_left(self):
        faces = [_make_face(pose=[0.0 if i % 2 == 0 else -15.0, 0.0, 0.0]) for i in range(10)]
        call_count = [0]
        def _get_cycling(frame):
            f = faces[call_count[0] % len(faces)]
            call_count[0] += 1
            return [f]

        with patch.object(svc.face_app, "get", side_effect=_get_cycling):
            passed, detail = svc.active_liveness_check(_frames(10), "turn_right")

        self.assertTrue(passed)

    def test_turn_left_fails_with_small_yaw(self):
        # All frames identical pose → no deviation
        _face_analysis_instance.set_faces([_make_face(pose=[1.0, 0.0, 0.0])])
        passed, _ = svc.active_liveness_check(_frames(10), "turn_left")
        self.assertFalse(passed)

    def test_look_up_passes_when_pitch_below_threshold(self):
        faces = [_make_face(pose=[0.0, -10.0, 0.0])] * 10
        call_count = [0]
        def _get_one(frame):
            return [faces[0]]

        with patch.object(svc.face_app, "get", side_effect=_get_one):
            passed, detail = svc.active_liveness_check(_frames(10), "look_up")

        self.assertTrue(passed)
        self.assertIn("Look up", detail)

    def test_look_down_passes_when_pitch_above_threshold(self):
        with patch.object(svc.face_app, "get", return_value=[_make_face(pose=[0.0, 10.0, 0.0])]):
            passed, detail = svc.active_liveness_check(_frames(10), "look_down")

        self.assertTrue(passed)
        self.assertIn("Look down", detail)

    def test_unknown_challenge_returns_false(self):
        with patch.object(svc.face_app, "get", return_value=[_make_face(pose=[0.0, 0.0, 0.0])]):
            passed, detail = svc.active_liveness_check(_frames(10), "blink")

        self.assertFalse(passed)
        self.assertIn("Unknown", detail)

    def test_no_pose_attribute_skips_frame(self):
        face = _make_face()
        face.pose = None  # pose absent
        with patch.object(svc.face_app, "get", return_value=[face]):
            passed, detail = svc.active_liveness_check(_frames(10), "turn_left")
        self.assertFalse(passed)
        self.assertIn("Not enough", detail)


# ─────────────────────────────────────────────────────────────────────────────
# Flask route tests
# ─────────────────────────────────────────────────────────────────────────────

class TestHealthRoute(unittest.TestCase):
    def setUp(self):
        svc.app_flask.testing = True
        self.client = svc.app_flask.test_client()

    def test_health_returns_200(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)

    def test_health_response_body(self):
        resp = self.client.get("/health")
        data = resp.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "face-liveness")


class TestRegisterRoute(unittest.TestCase):
    def setUp(self):
        svc.app_flask.testing = True
        self.client = svc.app_flask.test_client()
        _face_analysis_instance.set_faces([_make_face()])

    def _post(self, frames):
        return self.client.post("/register", json={"frames": frames})

    def test_fewer_than_5_frames_returns_400(self):
        resp = self._post(_frames(3))
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.get_json()["success"])

    def test_successful_registration_returns_200_with_embedding(self):
        # passive_liveness_check needs ≥5 texture scores → 10 frames
        with patch.object(svc, "passive_liveness_check",
                          return_value=(50, "OK", _make_face(), _b64_frame())):
            resp = self._post(_frames(10))

        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertTrue(body["success"])
        self.assertIn("embedding", body)
        self.assertEqual(len(body["embedding"]), 512)

    def test_failed_liveness_returns_401(self):
        with patch.object(svc, "passive_liveness_check",
                          return_value=(10, "Low texture", None, None)):
            resp = self._post(_frames(10))

        self.assertEqual(resp.status_code, 401)
        self.assertFalse(resp.get_json()["success"])

    def test_no_face_embedding_after_liveness_returns_400(self):
        no_embed_face = _make_face()
        no_embed_face.embedding = None
        with patch.object(svc, "passive_liveness_check",
                          return_value=(50, "OK", no_embed_face, _b64_frame())):
            resp = self._post(_frames(10))

        self.assertEqual(resp.status_code, 400)

    def test_empty_frames_list_returns_400(self):
        resp = self._post([])
        self.assertEqual(resp.status_code, 400)


class TestVerifyRoute(unittest.TestCase):
    def setUp(self):
        svc.app_flask.testing = True
        self.client = svc.app_flask.test_client()
        self._embedding = [0.1] * 512

    def _post(self, payload):
        return self.client.post("/verify", json=payload)

    def _good_payload(self, challenge_type=None):
        p = {"frames": _frames(10), "stored_embedding": self._embedding}
        if challenge_type:
            p["challenge_type"] = challenge_type
        return p

    # ── Missing required fields ───────────────────────────────────────────────

    def test_missing_frames_returns_400(self):
        resp = self._post({"stored_embedding": self._embedding})
        self.assertEqual(resp.status_code, 400)

    def test_missing_stored_embedding_returns_400(self):
        resp = self._post({"frames": _frames(10)})
        self.assertEqual(resp.status_code, 400)

    # ── Passive-only path ─────────────────────────────────────────────────────

    def test_face_match_returns_200_with_match_true(self):
        # High similarity: stored and live embeddings are identical
        identical = [1.0] * 512
        face = _make_face(embedding=identical)
        with patch.object(svc, "passive_liveness_check",
                          return_value=(50, "OK", face, _b64_frame())):
            resp = self._post({"frames": _frames(10), "stored_embedding": identical})

        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertTrue(body["success"])
        self.assertTrue(body["match"])
        self.assertAlmostEqual(body["similarity"], 1.0, places=3)

    def test_face_no_match_returns_401(self):
        live_embed = [1.0] * 512
        stored_embed = [-1.0] * 512  # opposite → similarity = -1
        face = _make_face(embedding=live_embed)
        with patch.object(svc, "passive_liveness_check",
                          return_value=(50, "OK", face, _b64_frame())):
            resp = self._post({"frames": _frames(10), "stored_embedding": stored_embed})

        self.assertEqual(resp.status_code, 401)
        body = resp.get_json()
        self.assertFalse(body["success"])
        self.assertFalse(body["match"])

    def test_passive_liveness_fail_no_challenge_returns_401(self):
        with patch.object(svc, "passive_liveness_check",
                          return_value=(10, "Low texture", _make_face(), _b64_frame())):
            resp = self._post(self._good_payload())

        self.assertEqual(resp.status_code, 401)
        body = resp.get_json()
        self.assertFalse(body["liveness"])

    def test_no_best_face_after_passive_returns_400(self):
        with patch.object(svc, "passive_liveness_check",
                          return_value=(50, "OK", None, None)):
            resp = self._post(self._good_payload())

        self.assertEqual(resp.status_code, 400)

    # ── Active challenge path ─────────────────────────────────────────────────

    def test_active_challenge_pass_then_face_match(self):
        face = _make_face(embedding=[1.0] * 512)
        with patch.object(svc, "passive_liveness_check",
                          return_value=(50, "OK", face, _b64_frame())), \
             patch.object(svc, "active_liveness_check",
                          return_value=(True, "turn_left OK")):
            resp = self._post(self._good_payload(challenge_type="turn_left"))

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.get_json()["success"])

    def test_active_challenge_fail_returns_401(self):
        face = _make_face(embedding=[1.0] * 512)
        with patch.object(svc, "passive_liveness_check",
                          return_value=(50, "OK", face, _b64_frame())), \
             patch.object(svc, "active_liveness_check",
                          return_value=(False, "no movement")):
            resp = self._post(self._good_payload(challenge_type="turn_left"))

        self.assertEqual(resp.status_code, 401)
        self.assertFalse(resp.get_json()["liveness"])

    def test_similarity_threshold_boundary_above(self):
        # Similarity exactly at threshold (0.6) should match
        stored = [1.0, 0.0]
        live_embed_arr = np.array([1.0, 0.0])
        face = _make_face(embedding=live_embed_arr)
        with patch.object(svc, "passive_liveness_check",
                          return_value=(50, "OK", face, _b64_frame())), \
             patch.object(svc, "cosine_similarity", return_value=0.6):
            resp = self._post({"frames": _frames(10), "stored_embedding": stored})

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.get_json()["match"])

    def test_similarity_just_below_threshold_no_match(self):
        face = _make_face()
        with patch.object(svc, "passive_liveness_check",
                          return_value=(50, "OK", face, _b64_frame())), \
             patch.object(svc, "cosine_similarity", return_value=0.599):
            resp = self._post(self._good_payload())

        self.assertEqual(resp.status_code, 401)
        self.assertFalse(resp.get_json()["match"])


class TestCheckPoseRoute(unittest.TestCase):
    def setUp(self):
        svc.app_flask.testing = True
        self.client = svc.app_flask.test_client()

    def _post(self, payload):
        return self.client.post("/check-pose", json=payload)

    def test_missing_frame_returns_400(self):
        resp = self._post({})
        self.assertEqual(resp.status_code, 400)

    def test_no_face_detected_returns_face_detected_false(self):
        with patch.object(svc.face_app, "get", return_value=[]):
            resp = self._post({"frame": _b64_frame()})

        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertFalse(body["face_detected"])
        self.assertFalse(body["has_pose"])

    def test_face_with_pose_returns_yaw_pitch(self):
        face = _make_face(pose=[12.5, -5.3, 0.0], bbox=[10, 10, 80, 80])
        with patch.object(svc.face_app, "get", return_value=[face]):
            with patch.object(_cv2, "imdecode",
                              return_value=np.zeros((100, 100, 3), dtype=np.uint8)):
                resp = self._post({"frame": _b64_frame()})

        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertTrue(body["face_detected"])
        self.assertTrue(body["has_pose"])
        self.assertAlmostEqual(body["yaw"], 12.5, places=1)
        self.assertAlmostEqual(body["pitch"], -5.3, places=1)

    def test_face_without_pose_returns_has_pose_false(self):
        face = _make_face(bbox=[10, 10, 80, 80])
        face.pose = None
        with patch.object(svc.face_app, "get", return_value=[face]):
            with patch.object(_cv2, "imdecode",
                              return_value=np.zeros((100, 100, 3), dtype=np.uint8)):
                resp = self._post({"frame": _b64_frame()})

        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertTrue(body["face_detected"])
        self.assertFalse(body["has_pose"])

    def test_bbox_normalized_to_frame_dimensions(self):
        face = _make_face(bbox=[0, 0, 50, 100])
        with patch.object(svc.face_app, "get", return_value=[face]):
            with patch.object(_cv2, "imdecode",
                              return_value=np.zeros((100, 100, 3), dtype=np.uint8)):
                resp = self._post({"frame": _b64_frame()})

        body = resp.get_json()
        if body.get("face_detected") and "bbox" in body:
            bbox = body["bbox"]
            self.assertAlmostEqual(bbox["w"], 0.5, places=2)
            self.assertAlmostEqual(bbox["h"], 1.0, places=2)

    def test_invalid_frame_returns_gracefully(self):
        with patch.object(_cv2, "imdecode", return_value=None):
            resp = self._post({"frame": _b64_frame()})

        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertFalse(body["face_detected"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
