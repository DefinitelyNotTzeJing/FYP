import cv2
import numpy as np
import json
import time
from insightface.app import FaceAnalysis

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

def verify_face(stored_embedding_json):
    """Live verification against stored embedding"""
    stored_embedding = np.array(json.loads(stored_embedding_json))
    
    cap = cv2.VideoCapture(0)
    print("📷 Verification Mode - Press SPACE to verify, Q to quit")
    print("ℹ️  Move closer to the camera - only the CLOSEST face will be verified")
    
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
                color = (0, 255, 0)  # Green - this will be verified
                thickness = 3
                cv2.putText(frame, "TARGET", (box[0], box[1]-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            else:
                color = (128, 128, 128)  # Gray - will be ignored
                thickness = 2
                cv2.putText(frame, "IGNORED", (box[0], box[1]-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (128, 128, 128), 1)
            
            cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), color, thickness)
        
        # Display instructions
        cv2.putText(frame, "Press SPACE to verify", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Display FPS
        cv2.putText(frame, f"FPS: {int(fps)}", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Display face count
        if len(faces) > 0:
            cv2.putText(frame, f"Faces: {len(faces)}", (10, 90), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        
        cv2.imshow('Verify Face', frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord(' '):
            if target_face is not None:
                live_embedding = target_face.embedding
                
                # Calculate similarity
                similarity = np.dot(live_embedding, stored_embedding) / (
                    np.linalg.norm(live_embedding) * np.linalg.norm(stored_embedding)
                )
                
                print(f"\nSimilarity: {similarity:.4f}")
                if len(faces) > 1:
                    print(f"ℹ️  Note: {len(faces)} faces detected, but only the closest one was verified")
                
                if similarity > 0.6:
                    print("✅ VERIFIED!")
                    result_text = "VERIFIED!"
                    color = (0, 255, 0)
                else:
                    print("❌ VERIFICATION FAILED!")
                    result_text = "FAILED!"
                    color = (0, 0, 255)
                
                # Show result
                result_frame = frame.copy()
                cv2.putText(result_frame, result_text, (50, 100), 
                           cv2.FONT_HERSHEY_SIMPLEX, 2, color, 4)
                cv2.putText(result_frame, f"Score: {similarity:.2f}", (50, 150), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
                cv2.imshow('Verify Face', result_frame)
                cv2.waitKey(2000)
            else:
                print("❌ No face detected!")
        
        elif key == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

# ===== MAIN PROGRAM =====
if __name__ == "__main__":
    print("=== Face Recognition System ===")
    print("1. Register new face")
    print("2. Verify face")
    
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
        # Verification
        try:
            # Load from file (in real app, load from database)
            with open('face_data.json', 'r') as f:
                data = json.load(f)
                stored_embedding_json = data['embedding']
            
            verify_face(stored_embedding_json)
        except FileNotFoundError:
            print("❌ No registered face found! Please register first (option 1)")