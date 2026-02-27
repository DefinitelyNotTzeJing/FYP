from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import json
import base64
from insightface.app import FaceAnalysis

app = Flask(__name__)
CORS(app)  # Allow Laravel and React to communicate with this API

# Initialize face detection (this takes a few seconds on startup)
print("=" * 60)
print("Initializing Face Recognition API...")
print("=" * 60)

face_app = FaceAnalysis(providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))

print("✅ Face Recognition API is ready!")
print("=" * 60)


@app.route('/', methods=['GET'])
def home():
    """Home endpoint"""
    return jsonify({
        'message': 'Face Recognition API',
        'version': '1.0',
        'endpoints': {
            'health': '/health',
            'register': '/register-face',
            'verify': '/verify-face'
        }
    })


@app.route('/health', methods=['GET'])
def health_check():
    """Check if API is running"""
    return jsonify({
        'status': 'ok',
        'message': 'Face Recognition API is running'
    })


@app.route('/register-face', methods=['POST'])
def register_face():
    """
    Register a face from base64 image
    Input: {'image': 'base64_string'}
    Output: {'success': True, 'embedding': '[...]'}
    """
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({'error': 'No image provided'}), 400
        
        print("📸 Received image for registration")
        
        # Decode base64 image
        # Handle both formats: "data:image/jpeg;base64,..." and raw base64
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        image_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Failed to decode image'}), 400
        
        print(f"✅ Image decoded successfully: {img.shape}")
        
        # Detect faces
        faces = face_app.get(img)
        
        print(f"👤 Detected {len(faces)} face(s)")
        
        if len(faces) == 0:
            return jsonify({'error': 'No face detected. Please ensure your face is clearly visible.'}), 400
        
        if len(faces) > 1:
            return jsonify({'error': 'Multiple faces detected. Please ensure only one face is visible.'}), 400
        
        # Get embedding (512 numbers)
        embedding = faces[0].embedding
        embedding_list = embedding.tolist()
        embedding_json = json.dumps(embedding_list)
        
        print(f"✅ Face embedding extracted: {len(embedding_list)} dimensions")
        
        return jsonify({
            'success': True,
            'embedding': embedding_json,
            'message': 'Face registered successfully'
        })
    
    except Exception as e:
        print(f"❌ Error in register-face: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/verify-face', methods=['POST'])
def verify_face():
    """
    Verify a face against stored embedding
    Input: {
        'image': 'base64_string',
        'stored_embedding': 'json_string',
        'threshold': 0.6 (optional)
    }
    Output: {'success': True, 'match': True/False, 'similarity': 0.85}
    """
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        stored_embedding_json = data.get('stored_embedding')
        threshold = data.get('threshold', 0.6)  # Default threshold
        
        if not image_base64 or not stored_embedding_json:
            return jsonify({'error': 'Missing image or stored_embedding'}), 400
        
        print("📸 Received image for verification")
        
        # Decode base64 image
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        image_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Failed to decode image'}), 400
        
        print(f"✅ Image decoded successfully: {img.shape}")
        
        # Detect faces in live image
        faces = face_app.get(img)
        
        print(f"👤 Detected {len(faces)} face(s)")
        
        if len(faces) == 0:
            return jsonify({'error': 'No face detected. Please ensure your face is clearly visible.'}), 400
        
        if len(faces) > 1:
            return jsonify({'error': 'Multiple faces detected. Please ensure only one face is visible.'}), 400
        
        # Get live embedding
        live_embedding = faces[0].embedding
        
        # Convert stored embedding from JSON to numpy array
        if isinstance(stored_embedding_json, str):
            # It's a JSON string, parse it
            stored_embedding_list = json.loads(stored_embedding_json)
        elif isinstance(stored_embedding_json, list):
            # It's already a list
            stored_embedding_list = stored_embedding_json
        else:
            return jsonify({'error': 'Invalid stored_embedding format'}), 400

        stored_embedding = np.array(stored_embedding_list)
        
        # Calculate similarity (cosine similarity)
        similarity = np.dot(live_embedding, stored_embedding) / (
            np.linalg.norm(live_embedding) * np.linalg.norm(stored_embedding)
        )
        
        match = bool(similarity >= threshold)
        
        print(f"📊 Similarity: {similarity:.4f} | Threshold: {threshold} | Match: {match}")
        
        return jsonify({
            'success': True,
            'match': match,
            'similarity': float(similarity),
            'threshold': threshold,
            'message': 'Verification successful' if match else 'Verification failed'
        })
    
    except Exception as e:
        print(f"❌ Error in verify-face: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("🚀 Starting Face Recognition API Server")
    print("=" * 60)
    print("📍 Running on: http://127.0.0.1:5000")
    print("📍 Health check: http://127.0.0.1:5000/health")
    print("=" * 60 + "\n")
    
    # Run on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)