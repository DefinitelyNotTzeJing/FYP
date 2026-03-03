<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    public string $resetLink;

    public function __construct(string $otp, string $resetLink)
    {
        $this->otp = $otp;
        $this->resetLink = $resetLink;
    }

    public function build()
    {
        return $this->subject('Reset Your Password')
                    ->view('emails.password-reset');
    }
}