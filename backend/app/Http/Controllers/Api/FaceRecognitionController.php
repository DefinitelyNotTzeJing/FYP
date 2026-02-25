<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class FaceRecognitionController extends Controller
{
    private $pythonApiUrl = 'http://127.0.0.1:5000';

    /**
     * Check if Python Face API is running
     */
    public function healthCheck()
    {
        try {
            $response = Http::timeout(5)->get($this->pythonApiUrl . '/health');
            
            if ($response->successful()) {
                return response()->json([
                    'status' => 'ok',
                    'message' => 'Face Recognition API is running',
                    'python_api' => $response->json(),
                ]);
            }
            
            return response()->json([
                'status' => 'error',
                'message' => 'Python API returned error'
            ], 500);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot connect to Python Face API',
                'details' => $e->getMessage(),
                'help' => 'Make sure the Python API is running on port 5000'
            ], 500);
        }
    }

    /**
     * Register user's face
     * Requires authentication
     */
    public function registerFace(Request $request)
    {
        $request->validate([
            'image' => 'required|string', // Base64 image from webcam
        ]);

        try {
            // Get authenticated user
            $user = $request->user();

            // Send image to Python API
            $response = Http::timeout(30)->post($this->pythonApiUrl . '/register-face', [
                'image' => $request->image,
            ]);

            if (!$response->successful()) {
                $error = $response->json()['error'] ?? 'Face registration failed';
                return response()->json(['error' => $error], 400);
            }

            $data = $response->json();
            
            // Store embedding in database
            $user->face_embedding = json_decode($data['embedding']);
            $user->face_registered_at = now();
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Face registered successfully',
                'user' => [
                    'user_id' => $user->user_id,
                    'email' => $user->email,
                    'username' => $user->username,
                    'face_registered_at' => $user->face_registered_at,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to register face',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify user's face for login
     * Does NOT require authentication (this is the login)
     */
    public function verifyFace(Request $request)
    {
        $request->validate([
            'image' => 'required|string', // Base64 image from webcam
            'email' => 'required|email',
        ]);

        try {
            // Find user by email
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            if (!$user->face_embedding) {
                return response()->json([
                    'error' => 'Face not registered',
                    'message' => 'This user has not registered their face yet'
                ], 400);
            }

            // Send to Python API for verification
            $response = Http::timeout(30)->post($this->pythonApiUrl . '/verify-face', [
                'image' => $request->image,
                'stored_embedding' => json_encode($user->face_embedding),
                'threshold' => 0.6,
            ]);

            if (!$response->successful()) {
                $error = $response->json()['error'] ?? 'Face verification failed';
                return response()->json(['error' => $error], 400);
            }

            $data = $response->json();

            if ($data['match']) {
                // Face matched! Create authentication token
                $token = $user->createToken('face-auth')->plainTextToken;

                return response()->json([
                    'success' => true,
                    'message' => 'Login successful',
                    'user' => $user->load('profile'),
                    'token' => $token,
                    'similarity' => $data['similarity'],
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Face verification failed',
                    'message' => 'The face does not match',
                    'similarity' => $data['similarity'],
                ], 401);
            }

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to verify face',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove user's face data
     * Requires authentication
     */
    public function removeFace(Request $request)
    {
        try {
            $user = $request->user();
            
            $user->face_embedding = null;
            $user->face_registered_at = null;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Face data removed successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to remove face data',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if user has registered face
     * Requires authentication
     */
    public function checkFaceStatus(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'has_face' => !is_null($user->face_embedding),
            'registered_at' => $user->face_registered_at,
        ]);
    }
}