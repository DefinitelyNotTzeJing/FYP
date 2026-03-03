<!DOCTYPE html>
<html>
    <body>
        <h2>Password Reset Request</h2>
        <p>Use the OTP below or click the link to reset your password. Both expire in 15 minutes.</p>

        <h1 style="letter-spacing: 8px;">{{ $otp }}</h1>

        <p>Or click here: <a href="{{ $resetLink }}">Reset Password</a></p>

        <p>If you didn't request this, ignore this email.</p>
    </body>
</html>