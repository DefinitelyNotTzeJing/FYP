import cv2
import numpy as np
import json
import time
from insightface.app import FaceAnalysis
from collections import deque
import random
import base64

# Initialize
app = FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(320, 320))

def capture_and_convert_base64():
    """NEW FUNCTION: Capture face and convert to base64 for API"""
    window_name = 'Face Capture - Press SPACE'
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 640, 480)
    
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    print("\n" + "="*70)
    print("📷 CAPTURE MODE - For Postman/API Testing")
    print("="*70)
    print("Instructions:")
    print("  - Position your face in the green box")
    print("  - Press SPACE to capture")
    print("  - Press Q to quit")
    print("="*70 + "\n")
    
    base64_image = None
    prev_time = time.time()
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        fps = 1 / (time.time() - prev_time)
        prev_time = time.time()
        
        faces = app.get(frame)
        target_face = get_largest_face(faces)
        
        if target_face is not None:
            box = target_face.bbox.astype(int)
            cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 3)
            cv2.putText(frame, "✅ Face Detected", (10, 90), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        else:
            cv2.putText(frame, "❌ No Face Detected", (10, 90), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        cv2.putText(frame, "Press SPACE to capture image", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, "Press Q to quit", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, f"FPS: {int(fps)}", (10, frame.shape[0] - 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        cv2.imshow(window_name, frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord(' '):  # SPACE to capture
            # Save image temporarily
            cv2.imwrite('temp_capture.jpg', frame)
            
            # Convert to base64
            with open('temp_capture.jpg', 'rb') as f:
                image_data = f.read()
                base64_encoded = base64.b64encode(image_data).decode('utf-8')
                base64_image = f"data:image/jpeg;base64,{base64_encoded}"
            
            # Save to text file for easy copying
            with open('base64_image.txt', 'w') as f:
                f.write(base64_image)
            
            print("\n✅ Image captured successfully!")
            print(f"📁 Saved to: base64_image.txt")
            print(f"📏 Size: {len(base64_image)} characters")
            print(f"📋 First 100 chars: {base64_image[:100]}...")
            print("\n" + "="*70)
            print("NEXT STEPS:")
            print("  1. Open base64_image.txt")
            print("  2. Copy the ENTIRE content")
            print("  3. Paste into Postman body:")
            print('     { "image": "PASTE_HERE" }')
            print("="*70)
            break
            
        elif key == ord('q'):  # Q to quit
            print("\n⚠️  Cancelled by user")
            break
    
    cap.release()
    cv2.destroyAllWindows()
    return base64_image

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
    # Set window size and properties
    window_name = 'Face Register'
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)  # Resizable
    cv2.resizeWindow(window_name, 640, 480)  # window size

    """Capture face and save embedding"""
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    print("📷 Registration Mode - Press SPACE to capture")
    
    embedding_json = None
    prev_time = time.time()
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        fps = 1 / (time.time() - prev_time)
        prev_time = time.time()
        
        faces = app.get(frame)
        target_face = get_largest_face(faces)
        
        if target_face is not None:
            box = target_face.bbox.astype(int)
            cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 3)
        
        cv2.putText(frame, "Press SPACE to register", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, f"FPS: {int(fps)}", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.imshow('Face Register', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord(' ') and target_face is not None:
            embedding_json = json.dumps(target_face.embedding.tolist())
            print("✅ Face registered!")
            break
        elif key == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    return embedding_json


class PassiveLivenessDetector:
    """Quick passive checks"""
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.face_positions = deque(maxlen=20)
        self.texture_scores = deque(maxlen=10)
        self.frame_count = 0
    
    def analyze(self, face, frame):
        """Analyze frame"""
        self.frame_count += 1
        
        # Track position
        box = face.bbox.astype(int)
        center = ((box[0] + box[2]) // 2, (box[1] + box[3]) // 2)
        self.face_positions.append(center)
        
        # Texture analysis
        face_region = frame[box[1]:box[3], box[0]:box[2]]
        if face_region.size > 0:
            gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
            texture = cv2.Laplacian(gray, cv2.CV_64F).var()
            self.texture_scores.append(texture)
    
    def get_score(self):
        """Get passive liveness score"""
        if self.frame_count < 10:
            return 0, "Analyzing..."
        
        # Check texture
        avg_texture = np.mean(self.texture_scores)
        texture_pass = avg_texture > 40
        
        # Check movement
        movement_score = 0
        movement_type = "unknown"
        
        if len(self.face_positions) >= 10:
            positions = np.array(self.face_positions)
            x_var = np.var(positions[:, 0])
            y_var = np.var(positions[:, 1])
            total_movement = x_var + y_var
            
            if total_movement < 2:
                movement_type = "STATIC (photo?)"
                movement_score = 0
            elif 2 <= total_movement <= 50:
                movement_type = "Natural"
                movement_score = 50
            elif 50 < total_movement <= 200:
                movement_type = "Active"
                movement_score = 30
            else:
                movement_type = "EXCESSIVE (wiggling?)"
                movement_score = 10
        
        # Calculate final score
        score = 0
        details = []
        
        if texture_pass:
            score += 30
            details.append("Texture: OK")
        else:
            details.append(f"Texture: Low ({avg_texture:.0f})")
        
        score += movement_score
        details.append(f"Movement: {movement_type}")
        
        detail_str = " | ".join(details)
        
        return score, detail_str


class ActiveChallenge:
    """Active liveness challenge"""
    
    def __init__(self):
        self.type = None
        self.instruction = None
        self.start_time = None
        self.duration = 0
        self.poses = []
    
    def start(self):
        """Start random challenge"""
        challenges = [
            ('turn_left', '⬅️ TURN HEAD LEFT', 4),
            ('turn_right', '➡️ TURN HEAD RIGHT', 4),
            ('look_up', '⬆️ LOOK UP', 4),
            ('look_down', '⬇️ LOOK DOWN', 4),
        ]
        
        self.type, self.instruction, self.duration = random.choice(challenges)
        self.start_time = time.time()
        self.poses = []
        return self.instruction
    
    def collect(self, face):
        """Collect frame data"""
        if hasattr(face, 'pose') and face.pose is not None:
            self.poses.append({
                'yaw': face.pose[0],    # left/right
                'pitch': face.pose[1],  # up/down
                'roll': face.pose[2],   # tilt
            })
    
    def is_complete(self):
        """Check if time is up"""
        return time.time() - self.start_time >= self.duration
    
    def verify(self):
        """Verify challenge was completed"""
        if len(self.poses) < 10:
            return False, f"Not enough data ({len(self.poses)} frames)"
        
        yaws = [p['yaw'] for p in self.poses]
        pitches = [p['pitch'] for p in self.poses]
        
        if self.type == 'turn_left':
            min_yaw = min(yaws)
            if min_yaw < -5:
                return True, f"✅ Turned left {min_yaw:.0f}°"
            return False, f"❌ Only {min_yaw:.0f}° left (need 5°+)"
        
        elif self.type == 'turn_right':
            max_yaw = max(yaws)
            if max_yaw > 5:
                return True, f"✅ Turned right {abs(max_yaw):.0f}°"
            return False, f"❌ Only {abs(max_yaw):.0f}° right (need 5°+)"
        
        elif self.type == 'look_up':
            min_pitch = min(pitches)
            if min_pitch < -5:
                return True, f"✅ Looked up {abs(min_pitch):.0f}°"
            return False, f"❌ Only {abs(min_pitch):.0f}° up (need 5°+)"
        
        elif self.type == 'look_down':
            max_pitch = max(pitches)
            if max_pitch > 5:
                return True, f"✅ Looked down {max_pitch:.0f}°"
            return False, f"❌ Only {max_pitch:.0f}° down (need 5°+)"
        
        return False, "Unknown challenge"
    
    def time_left(self):
        """Time remaining"""
        return max(0, self.duration - (time.time() - self.start_time))


def verify_face_hybrid(stored_embedding_json):
    # Set window size and properties
    window_name = 'Hybrid Liveness Verification'
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)  # Resizable
    cv2.resizeWindow(window_name, 640, 480)  # window size

    """
    HYBRID VERIFICATION:
    1. Passive check (3 seconds)
    2. Active challenge (if score < 70)
    3. Face matching
    """
    stored_embedding = np.array(json.loads(stored_embedding_json))
    
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    print("\n" + "="*70)
    print("🔐 HYBRID LIVENESS VERIFICATION")
    print("="*70)
    print("This will test in 2 stages:")
    print("  Stage 1: Passive analysis (3 seconds)")
    print("  Stage 2: Active challenge (if needed)")
    print("="*70)
    print("\nPress Q to quit\n")
    
    # State
    stage = "passive"
    passive_detector = PassiveLivenessDetector()
    active_challenge = None
    passive_start = time.time()
    result = None
    
    prev_time = time.time()
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        fps = 1 / (time.time() - prev_time)
        prev_time = time.time()
        
        faces = app.get(frame)
        target_face = get_largest_face(faces)
        
        # Background
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (frame.shape[1], 250), (0, 0, 0), -1)
        frame = cv2.addWeighted(overlay, 0.3, frame, 0.7, 0)
        
        # === STAGE 1: PASSIVE ANALYSIS ===
        if stage == "passive":
            if target_face is not None:
                passive_detector.analyze(target_face, frame)
                box = target_face.bbox.astype(int)
                cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 255), 3)
            
            passive_score, passive_msg = passive_detector.get_score()
            elapsed = time.time() - passive_start
            
            # Display
            y = 40
            cv2.putText(frame, "STAGE 1: PASSIVE ANALYSIS", 
                       (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 0), 2)
            
            y += 40
            cv2.putText(frame, "Look at camera naturally...", 
                       (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            y += 40
            score_color = (0, 255, 0) if passive_score >= 70 else (0, 165, 255) if passive_score >= 40 else (0, 0, 255)
            cv2.putText(frame, f"Liveness: {passive_score}% - {passive_msg}", 
                       (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, score_color, 2)
            
            y += 35
            cv2.putText(frame, f"Time: {elapsed:.1f}s / 3.0s", 
                       (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)
            
            # After 3 seconds, decide
            if elapsed >= 3.0:
                print(f"\n{'='*70}")
                print(f"PASSIVE RESULT: {passive_score}% - {passive_msg}")
                print(f"{'='*70}")
                
                if passive_score >= 70:
                    # High confidence - skip challenge
                    print("✅ Passive check passed - High confidence!")
                    print("Skipping active challenge...")
                    stage = "verify"
                else:
                    # Low confidence - trigger challenge
                    print(f"⚠️  Passive score: {passive_score}%")
                    print("Triggering active challenge for verification...")
                    active_challenge = ActiveChallenge()
                    instruction = active_challenge.start()  # This returns the instruction
                    print(f"\n🎯 CHALLENGE: {instruction}")
                    print("="*70)
                    stage = "challenge"
        
        # === STAGE 2: ACTIVE CHALLENGE ===
        elif stage == "challenge":
            if target_face is not None:
                active_challenge.collect(target_face)
                box = target_face.bbox.astype(int)
                
                # Pulsing effect
                pulse = int(abs(np.sin(time.time() * 3) * 100))
                color = (0, 255 - pulse, 255)
                cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), color, 3)
            
            time_left = active_challenge.time_left()
            
            # Display
            y = 40
            cv2.putText(frame, "STAGE 2: ACTIVE CHALLENGE", 
                       (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 0), 2)
            
            y += 60
            # Big instruction
            cv2.putText(frame, active_challenge.instruction, 
                       (10, y), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 255), 4)
            
            y += 60
            time_color = (0, 255, 0) if time_left > 1 else (0, 165, 255) if time_left > 0 else (0, 0, 255)
            cv2.putText(frame, f"Time: {time_left:.1f}s", 
                       (10, y), cv2.FONT_HERSHEY_SIMPLEX, 1.2, time_color, 3)
            
            y += 50
            cv2.putText(frame, f"Frames collected: {len(active_challenge.poses)}", 
                       (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
            
            # Check if complete
            if active_challenge.is_complete():
                success, msg = active_challenge.verify()
                
                print(f"\nCHALLENGE RESULT: {msg}")
                print(f"Frames collected: {len(active_challenge.poses)}")
                
                if success:
                    print("✅ Challenge passed!")
                    print("Proceeding to face verification...")
                    stage = "verify"
                else:
                    print("❌ Challenge failed!")
                    print("This appears to be a photo/screen/video.")
                    result = ("LIVENESS FAILED!", (0, 0, 255), 0, msg)
                    stage = "done"
        
        # === STAGE 3: FACE VERIFICATION ===
        elif stage == "verify":
            if target_face is not None:
                box = target_face.bbox.astype(int)
                cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 3)
                
                live_embedding = target_face.embedding
                similarity = np.dot(live_embedding, stored_embedding) / (
                    np.linalg.norm(live_embedding) * np.linalg.norm(stored_embedding)
                )
                
                print(f"\n{'='*70}")
                print(f"FACE VERIFICATION")
                print(f"{'='*70}")
                print(f"Similarity: {similarity:.4f}")
                
                if similarity > 0.6:
                    print("✅ FACE MATCH - Identity verified!")
                    print("🎉 AUTHENTICATION SUCCESSFUL!")
                    result = ("✅ VERIFIED!", (0, 255, 0), similarity, "Identity confirmed")
                else:
                    print("❌ Face doesn't match registered user")
                    result = ("❌ WRONG PERSON!", (0, 0, 255), similarity, "Face mismatch")
            else:
                print("\n❌ No face detected during verification")
                result = ("❌ NO FACE!", (0, 0, 255), 0, "No face found")
            
            stage = "done"
        
        # === SHOW RESULT ===
        if stage == "done" and result is not None:
            text, color, score, detail = result
            
            # Big result
            cv2.putText(frame, text, 
                       (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 2.5, color, 5)
            
            if score > 0:
                cv2.putText(frame, f"Match: {score:.3f}", 
                           (50, 370), cv2.FONT_HERSHEY_SIMPLEX, 1.5, color, 3)
            
            cv2.putText(frame, detail, 
                       (50, 430), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
        
        # FPS counter
        cv2.putText(frame, f"FPS: {int(fps)}", 
                   (frame.shape[1] - 120, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        cv2.imshow('Hybrid Liveness Verification', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            print("\n⚠️  Verification cancelled by user")
            break
        
        if stage == "done":
            print(f"\n{'='*70}")
            print("Press any key to close...")
            print(f"{'='*70}")
            cv2.waitKey(4000)
            break
    
    cap.release()
    cv2.destroyAllWindows()


# ===== MAIN =====
if __name__ == "__main__":
    print("\n" + "="*70)
    print("FACE RECOGNITION SYSTEM")
    print("="*70)
    
    print("\n1. Register new face (saves embedding to face_data.json)")
    print("2. Verify with hybrid liveness detection")
    print("3. Capture image and convert to Base64 (for Postman testing)")  # NEW OPTION
    
    choice = input("\nEnter choice (1, 2, or 3): ")
    
    if choice == "1": # This will run the face registration function which captures the face and saves the embedding as JSON in a file
        embedding = register_face()
        if embedding:
            with open('face_data.json', 'w') as f:
                json.dump({'embedding': embedding}, f)
            print("\n✅ Face data saved to face_data.json")
    
    elif choice == "2": # This will run the hybrid verification function which includes both passive and active checks before face matching
        try:
            with open('face_data.json', 'r') as f:
                stored = json.load(f)['embedding']
            # verify_face_hybrid(stored)  # This function is in your original file
            print("Verification function would run here...")
        except FileNotFoundError:
            print("\n❌ No registered face found!")
            print("Please register first (option 1)")
    
    elif choice == "3":  # Convert image to base64 for API testing
        base64_result = capture_and_convert_base64()
        if base64_result:
            print("\n🎉 Ready for Postman testing!")
        else:
            print("\n⚠️  No image captured")
    
    else:
        print("\n❌ Invalid choice!")