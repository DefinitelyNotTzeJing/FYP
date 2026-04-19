<?php

namespace Tests\Feature\Password;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->user = User::factory()->create(['password' => 'original123']);
    }

    // ── Forgot password ───────────────────────────────────────────────────────

    public function test_forgot_password_sends_otp_for_existing_email(): void
    {
        $this->postJson('/api/password/forgot', ['email' => $this->user->email])
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        $this->assertDatabaseHas('password_reset_tokens', ['email' => $this->user->email]);
    }

    public function test_forgot_password_stores_otp_and_token(): void
    {
        $this->postJson('/api/password/forgot', ['email' => $this->user->email]);

        $record = DB::table('password_reset_tokens')->where('email', $this->user->email)->first();

        $this->assertNotNull($record);
        $this->assertNotNull($record->otp);
        $this->assertNotNull($record->token);
        $this->assertEquals(6, strlen($record->otp));
    }

    public function test_forgot_password_fails_for_unknown_email(): void
    {
        $this->postJson('/api/password/forgot', ['email' => 'ghost@example.com'])
             ->assertStatus(422);
    }

    public function test_forgot_password_requires_email_field(): void
    {
        $this->postJson('/api/password/forgot', [])
             ->assertStatus(422);
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────

    public function test_verify_otp_succeeds_with_correct_otp(): void
    {
        $otp   = '123456';
        $token = 'test-token-abc';

        DB::table('password_reset_tokens')->insert([
            'email'      => $this->user->email,
            'otp'        => $otp,
            'token'      => $token,
            'expires_at' => now()->addMinutes(15),
            'created_at' => now(),
        ]);

        $this->postJson('/api/password/verify-otp', [
            'email' => $this->user->email,
            'otp'   => $otp,
        ])
             ->assertStatus(200)
             ->assertJson(['success' => true])
             ->assertJsonStructure(['token']);
    }

    public function test_verify_otp_fails_with_wrong_otp(): void
    {
        DB::table('password_reset_tokens')->insert([
            'email'      => $this->user->email,
            'otp'        => '999999',
            'token'      => 'abc',
            'expires_at' => now()->addMinutes(15),
            'created_at' => now(),
        ]);

        $this->postJson('/api/password/verify-otp', [
            'email' => $this->user->email,
            'otp'   => '000000',
        ])->assertStatus(400);
    }

    public function test_verify_otp_fails_when_expired(): void
    {
        DB::table('password_reset_tokens')->insert([
            'email'      => $this->user->email,
            'otp'        => '123456',
            'token'      => 'abc',
            'expires_at' => now()->subMinutes(1),
            'created_at' => now()->subMinutes(20),
        ]);

        $this->postJson('/api/password/verify-otp', [
            'email' => $this->user->email,
            'otp'   => '123456',
        ])->assertStatus(400);
    }

    public function test_verify_otp_fails_when_no_record_exists(): void
    {
        $this->postJson('/api/password/verify-otp', [
            'email' => $this->user->email,
            'otp'   => '123456',
        ])->assertStatus(400);
    }

    // ── Reset password ────────────────────────────────────────────────────────

    public function test_reset_password_with_valid_token(): void
    {
        $token = 'valid-reset-token';

        DB::table('password_reset_tokens')->insert([
            'email'      => $this->user->email,
            'otp'        => '123456',
            'token'      => $token,
            'expires_at' => now()->addMinutes(15),
            'created_at' => now(),
        ]);

        $this->postJson('/api/password/reset', [
            'email'                 => $this->user->email,
            'token'                 => $token,
            'password'              => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ])->assertStatus(200)->assertJson(['success' => true]);

        $this->assertTrue(Hash::check('newpassword1', $this->user->fresh()->password));
    }

    public function test_reset_password_deletes_token_after_use(): void
    {
        $token = 'one-time-token';

        DB::table('password_reset_tokens')->insert([
            'email'      => $this->user->email,
            'otp'        => '123456',
            'token'      => $token,
            'expires_at' => now()->addMinutes(15),
            'created_at' => now(),
        ]);

        $this->postJson('/api/password/reset', [
            'email'                 => $this->user->email,
            'token'                 => $token,
            'password'              => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ]);

        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $this->user->email]);
    }

    public function test_reset_password_fails_with_wrong_token(): void
    {
        DB::table('password_reset_tokens')->insert([
            'email'      => $this->user->email,
            'otp'        => '123456',
            'token'      => 'correct-token',
            'expires_at' => now()->addMinutes(15),
            'created_at' => now(),
        ]);

        $this->postJson('/api/password/reset', [
            'email'                 => $this->user->email,
            'token'                 => 'wrong-token',
            'password'              => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ])->assertStatus(400);
    }

    public function test_reset_password_fails_when_token_expired(): void
    {
        $token = 'expired-token';

        DB::table('password_reset_tokens')->insert([
            'email'      => $this->user->email,
            'otp'        => '123456',
            'token'      => $token,
            'expires_at' => now()->subMinutes(1),
            'created_at' => now()->subMinutes(20),
        ]);

        $this->postJson('/api/password/reset', [
            'email'                 => $this->user->email,
            'token'                 => $token,
            'password'              => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ])->assertStatus(400);
    }

    public function test_reset_password_requires_password_confirmation(): void
    {
        $this->postJson('/api/password/reset', [
            'email'                 => $this->user->email,
            'token'                 => 'some-token',
            'password'              => 'newpassword1',
            'password_confirmation' => 'mismatch456',
        ])->assertStatus(422);
    }

    public function test_reset_password_requires_minimum_8_characters(): void
    {
        DB::table('password_reset_tokens')->insert([
            'email'      => $this->user->email,
            'otp'        => '123456',
            'token'      => 'abc',
            'expires_at' => now()->addMinutes(15),
            'created_at' => now(),
        ]);

        $this->postJson('/api/password/reset', [
            'email'                 => $this->user->email,
            'token'                 => 'abc',
            'password'              => 'short',
            'password_confirmation' => 'short',
        ])->assertStatus(422);
    }

    // ── Change password (authenticated) ──────────────────────────────────────

    public function test_authenticated_user_can_change_password(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/password/change', [
                 'current_password'      => 'original123',
                 'password'              => 'newpassword1',
                 'password_confirmation' => 'newpassword1',
             ])
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        $this->assertTrue(Hash::check('newpassword1', $this->user->fresh()->password));
    }

    public function test_change_password_fails_with_wrong_current_password(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/password/change', [
                 'current_password'      => 'wrongcurrent',
                 'password'              => 'newpassword1',
                 'password_confirmation' => 'newpassword1',
             ])
             ->assertStatus(401);
    }

    public function test_change_password_revokes_all_tokens(): void
    {
        $token = $this->user->createToken('test')->plainTextToken;

        $this->actingAs($this->user)
             ->postJson('/api/password/change', [
                 'current_password'      => 'original123',
                 'password'              => 'newpassword1',
                 'password_confirmation' => 'newpassword1',
             ]);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $this->user->user_id,
        ]);
    }

    public function test_unauthenticated_user_cannot_change_password(): void
    {
        $this->postJson('/api/password/change', [
            'current_password'      => 'original123',
            'password'              => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ])->assertStatus(401);
    }
}
