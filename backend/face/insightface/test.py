import cv2
import numpy as np
import json
import time
from insightface.app import FaceAnalysis
from collections import deque

# Initialize
app = FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

def get_largest_face(faces):
    """Get the face with largest bounding box (closest to camera)"""
    if len(faces) == 0:
        return None
    
    largest_face = None
    max_area = 0
    
    for face in faces:
        box = face.bbox.astype(int)
        width = box[2] - box[0]
        height = box[3] - box[1]
        area = width * height
        
        if area > max_area:
            max_area = area
            largest_face = face
    
    return largest_face

def register_face():
    """Capture face and save embedding"""
    cap = cv2.VideoCapture(0)
    print("📷 Registration Mode - Press SPACE to capture your face")
    print("ℹ️  Move closer to the camera - only the CLOSEST face will be captured")
    
    embedding_json = None
    
    # FPS calculation variables
    prev_time = time.time()
    fps = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Calculate FPS
        current_time = time.time()
        fps = 1 / (current_time - prev_time)
        prev_time = current_time
        
        # Detect all faces
        faces = app.get(frame)
        
        # Get the largest (closest) face
        target_face = get_largest_face(faces)
        
        # Draw rectangles for ALL faces
        for face in faces:
            box = face.bbox.astype(int)
            
            # Compare using numpy arrays
            is_target = target_face is not None and np.array_equal(face.bbox, target_face.bbox)
            
            if is_target:
                color = (0, 255, 0)  # Green - this will be captured
                thickness = 3
                # Add "TARGET" label
                cv2.putText(frame, "TARGET", (box[0], box[1]-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            else:
                color = (128, 128, 128)  # Gray - will be ignored
                thickness = 2
                # Add "IGNORED" label
                cv2.putText(frame, "IGNORED", (box[0], box[1]-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (128, 128, 128), 1)
            
            cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), color, thickness)
        
        # Display instructions
        cv2.putText(frame, "Press SPACE to register", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Display FPS
        cv2.putText(frame, f"FPS: {int(fps)}", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Display face count
        if len(faces) > 0:
            cv2.putText(frame, f"Faces: {len(faces)}", (10, 90), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        
        cv2.imshow('Register Face', frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord(' '):
            if target_face is not None:
                # Extract embedding from the target (closest) face only
                embedding = target_face.embedding
                embedding_json = json.dumps(embedding.tolist())
                
                print("✅ Face registered successfully!")
                print(f"Embedding length: {len(embedding_json)} characters")
                if len(faces) > 1:
                    print(f"ℹ️  Note: {len(faces)} faces detected, but only the closest one was registered")
                break
            else:
                print("❌ No face detected. Try again.")
        
        elif key == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    return embedding_json


class LivenessDetector:
    """Detect liveness using multiple methods"""
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        """Reset tracking variables"""
        self.face_positions = deque(maxlen=30)  # Track last 30 frames
        self.eye_states = deque(maxlen=15)      # Track eye blinks
        self.head_poses = deque(maxlen=20)      # Track head movements
        self.texture_scores = []
        self.frame_count = 0
        
    def analyze_frame(self, face, frame):
        """Analyze single frame for liveness indicators"""
        self.frame_count += 1
        
        # 1. Track face position (detect movement)
        box = face.bbox.astype(int)
        face_center = ((box[0] + box[2]) // 2, (box[1] + box[3]) // 2)
        self.face_positions.append(face_center)
        
        # 2. Track head pose
        if hasattr(face, 'pose'):
            self.head_poses.append({
                'yaw': face.pose[0],
                'pitch': face.pose[1],
                'roll': face.pose[2]
            })
        
        # 3. Simple texture analysis (detect photo/screen)
        face_region = frame[box[1]:box[3], box[0]:box[2]]
        if face_region.size > 0:
            # Calculate Laplacian variance (measures sharpness/texture)
            gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            self.texture_scores.append(laplacian_var)
    
    def check_movement(self):
        """Check if face has natural movement (not static photo)"""
        if len(self.face_positions) < 10:
            return False, 0.0
        
        # Calculate movement variance
        positions = np.array(self.face_positions)
        x_variance = np.var(positions[:, 0])
        y_variance = np.var(positions[:, 1])
        total_movement = x_variance + y_variance
        
        # Real faces have micro-movements (5-50 pixels variance)
        # Photos are completely static (variance < 2)
        # Intentional movement is too large (variance > 100)
        
        has_movement = 5 < total_movement < 100
        confidence = min(total_movement / 50, 1.0) * 100  # Normalize to 0-100%
        
        return has_movement, confidence
    
    def check_texture(self):
        """Check if texture looks like real skin vs photo/screen"""
        if len(self.texture_scores) < 5:
            return False, 0.0
        
        avg_texture = np.mean(self.texture_scores)
        
        # Real skin: high texture variance (typically > 100)
        # Photos/screens: low variance (< 50)
        # Very blurry: also low (< 30)
        
        is_real_texture = avg_texture > 50
        confidence = min(avg_texture / 200, 1.0) * 100
        
        return is_real_texture, confidence
    
    def check_head_pose_variation(self):
        """Check for natural head pose variations"""
        if len(self.head_poses) < 10:
            return False, 0.0
        
        # Calculate variance in head poses
        yaw_values = [p['yaw'] for p in self.head_poses]
        pitch_values = [p['pitch'] for p in self.head_poses]
        
        yaw_var = np.var(yaw_values)
        pitch_var = np.var(pitch_values)
        
        # Real faces have slight pose variations
        # Photos are completely static
        has_variation = (yaw_var > 0.5) or (pitch_var > 0.5)
        confidence = min((yaw_var + pitch_var) / 10, 1.0) * 100
        
        return has_variation, confidence
    
    def get_liveness_score(self):
        """Calculate overall liveness score"""
        if self.frame_count < 15:
            return 0.0, "Analyzing..."
        
        # Check all indicators
        has_movement, movement_conf = self.check_movement()
        has_texture, texture_conf = self.check_texture()
        has_pose_var, pose_conf = self.check_head_pose_variation()
        
        # Calculate weighted score
        scores = []
        details = []
        
        if has_movement:
            scores.append(movement_conf * 0.4)  # 40% weight
            details.append(f"Movement: {movement_conf:.0f}%")
        else:
            details.append("Movement: FAIL")
        
        if has_texture:
            scores.append(texture_conf * 0.3)  # 30% weight
            details.append(f"Texture: {texture_conf:.0f}%")
        else:
            details.append("Texture: FAIL")
        
        if has_pose_var:
            scores.append(pose_conf * 0.3)  # 30% weight
            details.append(f"Pose: {pose_conf:.0f}%")
        else:
            details.append("Pose: FAIL")
        
        total_score = sum(scores) if scores else 0
        detail_str = " | ".join(details)
        
        return total_score, detail_str


def verify_face_with_liveness(stored_embedding_json):
    """Live verification with liveness detection"""
    stored_embedding = np.array(json.loads(stored_embedding_json))
    
    cap = cv2.VideoCapture(0)
    print("📷 Verification Mode with Liveness Detection")
    print("ℹ️  Move your head slightly and naturally")
    print("ℹ️  Press SPACE after 2-3 seconds to verify")
    print("Q to quit")
    
    liveness_detector = LivenessDetector()
    
    # FPS calculation
    prev_time = time.time()
    fps = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Calculate FPS
        current_time = time.time()
        fps = 1 / (current_time - prev_time)
        prev_time = current_time
        
        # Detect faces
        faces = app.get(frame)
        target_face = get_largest_face(faces)
        
        # Analyze for liveness
        if target_face is not None:
            liveness_detector.analyze_frame(target_face, frame)
        else:
            liveness_detector.reset()
        
        # Get liveness score
        liveness_score, liveness_details = liveness_detector.get_liveness_score()
        
        # Draw faces
        for face in faces:
            box = face.bbox.astype(int)
            is_target = target_face is not None and np.array_equal(face.bbox, target_face.bbox)
            
            if is_target:
                # Color based on liveness
                if liveness_score > 70:
                    color = (0, 255, 0)  # Green - looks live
                    label = "LIVE"
                elif liveness_score > 40:
                    color = (0, 165, 255)  # Orange - uncertain
                    label = "CHECKING"
                else:
                    color = (0, 0, 255)  # Red - likely fake
                    label = "SUSPICIOUS"
                
                thickness = 3
                cv2.putText(frame, f"{label} ({liveness_score:.0f}%)", 
                           (box[0], box[1]-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            else:
                color = (128, 128, 128)
                thickness = 2
                cv2.putText(frame, "IGNORED", (box[0], box[1]-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (128, 128, 128), 1)
            
            cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), color, thickness)
        
        # Display info
        y_offset = 30
        cv2.putText(frame, "Move head naturally, then SPACE to verify", 
                   (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        y_offset += 30
        cv2.putText(frame, f"FPS: {int(fps)}", 
                   (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        y_offset += 30
        if len(faces) > 0:
            cv2.putText(frame, f"Faces: {len(faces)}", 
                       (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        
        y_offset += 30
        # Liveness score
        score_color = (0, 255, 0) if liveness_score > 70 else (0, 165, 255) if liveness_score > 40 else (0, 0, 255)
        cv2.putText(frame, f"Liveness: {liveness_score:.0f}%", 
                   (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, score_color, 2)
        
        y_offset += 25
        cv2.putText(frame, liveness_details, 
                   (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        
        cv2.imshow('Verify Face', frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord(' '):
            if target_face is None:
                print("❌ No face detected!")
                continue
            
            # Check liveness first
            if liveness_score < 60:
                print(f"\n❌ LIVENESS CHECK FAILED!")
                print(f"Score: {liveness_score:.1f}% (need 60%+)")
                print(f"Details: {liveness_details}")
                print("⚠️  This might be a photo or screen. Please:")
                print("   1. Make sure you're a real person in front of camera")
                print("   2. Move your head slightly and naturally")
                print("   3. Ensure good lighting")
                print("   4. Wait 2-3 seconds before pressing SPACE")
                
                # Show warning on screen
                warning_frame = frame.copy()
                cv2.putText(warning_frame, "LIVENESS CHECK FAILED!", 
                           (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
                cv2.putText(warning_frame, f"Score: {liveness_score:.0f}% (need 60%+)", 
                           (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                cv2.imshow('Verify Face', warning_frame)
                cv2.waitKey(2000)
                continue
            
            # Liveness passed, now check face match
            live_embedding = target_face.embedding
            
            similarity = np.dot(live_embedding, stored_embedding) / (
                np.linalg.norm(live_embedding) * np.linalg.norm(stored_embedding)
            )
            
            print(f"\n✅ LIVENESS CHECK PASSED!")
            print(f"Liveness Score: {liveness_score:.1f}%")
            print(f"Details: {liveness_details}")
            print(f"\nFace Similarity: {similarity:.4f}")
            
            if similarity > 0.6:
                print("✅ FACE VERIFIED!")
                print("🎉 Authentication successful!")
                result_text = "VERIFIED!"
                color = (0, 255, 0)
            else:
                print("❌ FACE VERIFICATION FAILED!")
                print("⚠️  Face doesn't match registered user")
                result_text = "WRONG PERSON!"
                color = (0, 0, 255)
            
            # Show result
            result_frame = frame.copy()
            cv2.putText(result_frame, result_text, 
                       (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 2, color, 4)
            cv2.putText(result_frame, f"Face Match: {similarity:.2f}", 
                       (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
            cv2.putText(result_frame, f"Liveness: {liveness_score:.0f}%", 
                       (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.imshow('Verify Face', result_frame)
            cv2.waitKey(3000)
            
            # Reset for next verification
            liveness_detector.reset()
        
        elif key == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()


# ===== MAIN PROGRAM =====
if __name__ == "__main__":
    print("=== Face Recognition System with Liveness Detection ===")
    print("1. Register new face")
    print("2. Verify face (with liveness)")
    
    choice = input("\nEnter choice (1 or 2): ")
    
    if choice == "1":
        # Registration
        embedding_json = register_face()
        if embedding_json:
            print(f"\n💾 Save this to database:")
            print(f"{embedding_json[:100]}...")
            
            # Save to file for testing
            with open('face_data.json', 'w') as f:
                json.dump({'embedding': embedding_json}, f)
            print("✅ Also saved to face_data.json for testing")
    
    elif choice == "2":
        # Verification with liveness
        try:
            # Load from file (in real app, load from database)
            with open('face_data.json', 'r') as f:
                data = json.load(f)
                stored_embedding_json = data['embedding']
            
            verify_face_with_liveness(stored_embedding_json)
        except FileNotFoundError:
            print("❌ No registered face found! Please register first (option 1)")