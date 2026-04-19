<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    // ── Register ──────────────────────────────────────────────────────────────

    public function test_user_can_register_with_valid_data(): void
    {
        $response = $this->postJson('/api/register', [
            'email'                 => 'new@example.com',
            'username'              => 'newuser',
            'password'              => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['token', 'user' => ['email', 'username']]);

        $this->assertDatabaseHas('users', ['email' => 'new@example.com']);
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/register', [
            'email'                 => 'taken@example.com',
            'username'              => 'newuser',
            'password'              => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertStatus(422);
    }

    public function test_registration_fails_with_duplicate_username(): void
    {
        User::factory()->create(['username' => 'takenuser']);

        $this->postJson('/api/register', [
            'email'                 => 'new@example.com',
            'username'              => 'takenuser',
            'password'              => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertStatus(422);
    }

    public function test_registration_fails_with_mismatched_password(): void
    {
        $this->postJson('/api/register', [
            'email'                 => 'new@example.com',
            'username'              => 'newuser',
            'password'              => 'Password1!',
            'password_confirmation' => 'Different1!',
        ])->assertStatus(422);
    }

    public function test_registration_fails_with_missing_fields(): void
    {
        $this->postJson('/api/register', [])->assertStatus(422);
    }

    // ── Login ────────────────────────────────────────────────────────────────

    public function test_user_can_login_with_correct_credentials(): void
    {
        $user = User::factory()->create(['password' => 'secret123']);

        $response = $this->postJson('/api/login', [
            'email'    => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['token', 'user']);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create(['password' => 'correct']);

        $this->postJson('/api/login', [
            'email'    => $user->email,
            'password' => 'wrong',
        ])->assertStatus(401);
    }

    public function test_login_fails_with_unknown_email(): void
    {
        $this->postJson('/api/login', [
            'email'    => 'nobody@example.com',
            'password' => 'password',
        ])->assertStatus(401);
    }

    // ── Logout ───────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_logout(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/logout')->assertStatus(200);
    }

    public function test_unauthenticated_request_to_protected_route_returns_401(): void
    {
        $this->getJson('/api/user')->assertStatus(401);
    }

    // ── User profile ─────────────────────────────────────────────────────────

    public function test_authenticated_user_can_get_own_profile(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
             ->getJson('/api/user')
             ->assertStatus(200)
             ->assertJsonFragment(['email' => $user->email]);
    }

    public function test_user_can_update_username(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
             ->putJson('/api/user', ['username' => 'brandnew'])
             ->assertStatus(200);

        $this->assertDatabaseHas('users', ['user_id' => $user->user_id, 'username' => 'brandnew']);
    }
}
