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
     * Expects: { frames: [base64, ...] }
     */
    public function registerFace(Request $request)
    {
        $request->validate([
            'frames'   => 'required|array|min:5',
            'frames.*' => 'required|string',
        ]);

        try {
            $user = $request->user();

            // Forward frames + challenge to new liveness service
            $response = Http::timeout(60)->post($this->pythonApiUrl . '/register', [
                'frames'         => $request->frames,
                'challenge_type' => $request->challenge_type,
            ]);

            \Log::info('[RegisterFace] Python response:', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);

            if (!$response->successful()) {
                $error = $response->json()['message'] ?? 'Face registration failed';
                return response()->json(['message' => $error], 422);
            }

            $data = $response->json();

            // Store the 512-float embedding array as JSON in the database
            $user->face_embedding      = json_encode($data['embedding']);
            $user->face_registered_at  = now();
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Face registered successfully',
                'user'    => [
                    'user_id'            => $user->user_id,
                    'email'              => $user->email,
                    'username'           => $user->username,
                    'face_registered_at' => $user->face_registered_at,
                ],
            ]);

        } catch (\Exception $e) {
            \Log::error('[RegisterFace] Exception:', [
                'message' => $e->getMessage(),
                'line'    => $e->getLine(),
            ]);
            return response()->json([
                'message' => 'Failed to register face',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify user's face for login
     * Does NOT require authentication (this is the login endpoint)
     * Expects: { email: string, frames: [base64, ...] }
     */
    public function verifyFace(Request $request)
    {
        \Log::info('=== VERIFY FACE REQUEST START ===');

        $request->validate([
            'email'          => 'required|email',
            'frames'         => 'required|array|min:5',
            'frames.*'        => 'required|string',
            'challenge_type'  => 'nullable|string|in:turn_left,turn_right,look_up,look_down',
        ]);

        try {
            // Find user by email
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                return response()->json(['message' => 'User not found'], 404);
            }

            if (!$user->face_embedding) {
                return response()->json([
                    'message' => 'Face not registered. Please register your face first.',
                ], 400);
            }

            // Decode stored embedding back to array for Python
            $storedEmbedding = json_decode($user->face_embedding, true);

            \Log::info('[VerifyFace] Calling Python API...', [
                'user_id'        => $user->user_id,
                'frame_count'    => count($request->frames),
            ]);

            // Forward to new liveness service
            $response = Http::timeout(60)->post($this->pythonApiUrl . '/verify', [
                'frames'           => $request->frames,
                'stored_embedding' => $storedEmbedding,
                'challenge_type'   => $request->challenge_type,
            ]);

            \Log::info('[VerifyFace] Python response:', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);

            $data = $response->json();

            if ($response->status() === 401) {
                // Liveness or face match failed
                return response()->json([
                    'message' => $data['message'] ?? 'Face verification failed',
                    'detail'  => $data['detail'] ?? null,
                ], 401);
            }

            if (!$response->successful()) {
                return response()->json([
                    'message' => $data['message'] ?? 'Face verification failed',
                ], 422);
            }

            if ($data['match']) {
                $token = $user->createToken('face-auth')->plainTextToken;

                \Log::info('[VerifyFace] Match successful', ['similarity' => $data['similarity']]);

                return response()->json([
                    'success'    => true,
                    'message'    => 'Login successful',
                    'user'       => $user->load('profile'),
                    'token'      => $token,
                    'similarity' => $data['similarity'],
                ]);
            }

            return response()->json([
                'message'    => 'Face does not match',
                'similarity' => $data['similarity'] ?? null,
            ], 401);

        } catch (\Exception $e) {
            \Log::error('[VerifyFace] Exception:', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);
            return response()->json([
                'message' => 'Failed to verify face',
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

            $user->face_embedding     = null;
            $user->face_registered_at = null;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Face data removed successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to remove face data',
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
            'has_face'      => !is_null($user->face_embedding),
            'registered_at' => $user->face_registered_at,
        ]);
    }
}