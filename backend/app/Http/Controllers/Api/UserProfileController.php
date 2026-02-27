<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserProfile;
use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    /**
     * Get current user's profile
     * Requires authentication
     */
    public function show(Request $request)
    {
        try {
            $user = $request->user();
            $profile = $user->profile;

            if (!$profile) {
                return response()->json([
                    'success' => false,
                    'error' => 'Profile not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => [
                        'user_id' => $user->user_id,
                        'email' => $user->email,
                        'username' => $user->username,
                        'is_admin' => $user->is_admin,
                        'created_at' => $user->created_at,
                    ],
                    'profile' => [
                        'user_id' => $profile->user_id,
                        'username' => $user->username, // Include username from User model for easier access
                        'profile_image_url' => $profile->profile_image_url,
                        'date_of_birth' => $profile->date_of_birth,
                        'gender' => $profile->gender,
                        'payment_method' => $profile->payment_method,
                        'address' => $profile->address,
                        'phone' => $profile->phone,
                        'created_at' => $profile->created_at,
                        'updated_at' => $profile->updated_at,
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve profile',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update current user's profile
     * Requires authentication
     */
    public function update(Request $request)
    {
        try {
            $user = $request->user();
            $profile = $user->profile;

            if (!$profile) {
                return response()->json([
                    'success' => false,
                    'error' => 'Profile not found'
                ], 404);
            }

            // Validate input (all fields optional)
            $validated = $request->validate([
                // User table fields
                'username' => 'sometimes|string|max:100|unique:users,username,' . $user->user_id . ',user_id',
                
                // UserProfile table fields
                'profile_image_url' => 'sometimes|nullable|url',
                'date_of_birth' => 'sometimes|nullable|date',
                'gender' => 'sometimes|nullable|in:M,F,Other',
                'payment_method' => 'sometimes|nullable|string|max:50',
                'address' => 'sometimes|nullable|string|max:500',
                'phone' => 'sometimes|nullable|string|max:20',
            ]);

            // Update username in users table (if provided)
            if (isset($validated['username'])) {
                $user->update(['username' => $validated['username']]);
                unset($validated['username']); // Remove from array so it doesn't try to update profile table
            }

            // Update profile fields in user_profiles table
            if (!empty($validated)) {
                $profile->update($validated);
            }

            // Reload models to get fresh data
            $user->refresh();
            $profile->refresh();

            // Return updated data with BOTH user and profile info
            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => [
                    'user' => [
                        'user_id' => $user->user_id,
                        'username' => $user->username,
                        'email' => $user->email,
                        'is_admin' => $user->is_admin,
                    ],
                    'profile' => [
                        'user_id' => $profile->user_id,
                        'profile_image_url' => $profile->profile_image_url,
                        'date_of_birth' => $profile->date_of_birth,
                        'gender' => $profile->gender,
                        'payment_method' => $profile->payment_method,
                        'address' => $profile->address,
                        'phone' => $profile->phone,
                        'created_at' => $profile->created_at,
                        'updated_at' => $profile->updated_at,
                    ]
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update profile',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}