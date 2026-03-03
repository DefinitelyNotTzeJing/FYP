<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    // Step 1: Send OTP + reset link to email
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email|exists:users,email']);

        $user = User::where('email', $request->email)->first();

        // Generate OTP and token
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $token = Str::random(64);
        $expiresAt = now()->addMinutes(15);

        // Store in password_reset_tokens
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                // 'token' => Hash::make($token),   // Production: store hashed token
                'token' => $token,  // For testing only, remove in production
                'otp' => $otp,
                'expires_at' => $expiresAt,
                'created_at' => now(),
            ]
        );

        // Send email
        $resetLink = config('app.frontend_url') . '/reset-password?token=' . $token . '&email=' . urlencode($request->email);
        Mail::to($user->email)->send(new PasswordResetMail($otp, $resetLink));

        return response()->json([
            'success' => true,
            'message' => 'Password reset OTP and link sent to your email',
        ]);
    }

    // Step 2a: Verify OTP
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || $record->otp !== $request->otp) {
            return response()->json(['success' => false, 'message' => 'Invalid OTP'], 400);
        }

        if (now()->isAfter($record->expires_at)) {
            return response()->json(['success' => false, 'message' => 'OTP has expired'], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'OTP verified. Proceed to reset your password.',
            // 'token'   => $record->token, // hashed — frontend uses this for the reset step
            'token'   => $record->token,  // plain — for testing only, remove in production
        ]);
    }

    // Step 2b / Reset via token (from link or after OTP verify)
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'                 => 'required|email',
            'token'                 => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Invalid reset request'], 400);
        }

        if (now()->isAfter($record->expires_at)) {
            return response()->json(['success' => false, 'message' => 'Reset token has expired'], 400);
        }

        // // Production used compare hashed token
        // if (!Hash::check($request->token, $record->token)) {
        //     return response()->json(['success' => false, 'message' => 'Invalid token'], 400);
        // }

        // Postman testing with plain token, remove in production
        if ($request->token !== $record->token) {
            return response()->json(['success' => false, 'message' => 'Invalid token'], 400);
        }

        // Update password
        User::where('email', $request->email)->update([
            'password' => Hash::make($request->password),
        ]);

        // Delete used token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully',
        ]);
    }

    // Authenticated: Change password
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password'      => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect',
            ], 401);
        }

        $user->update(['password' => Hash::make($request->password)]);

        // Revoke all tokens to force re-login on other devices
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully. Please log in again.',
        ]);
    }
}