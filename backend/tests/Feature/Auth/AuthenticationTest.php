<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    // TC-UT-001: Register with valid details
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

    // TC-UT-002: Register with duplicate email
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

    // TC-UT-003: Register with empty required field
    public function test_registration_fails_with_missing_fields(): void
    {
        $this->postJson('/api/register', [])->assertStatus(422);
    }

    // TC-UT-004: Password login with valid credentials
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

    // TC-UT-005: Password login with incorrect password
    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create(['password' => 'correct']);

        $this->postJson('/api/login', [
            'email'    => $user->email,
            'password' => 'wrong',
        ])->assertStatus(401);
    }

    // TC-UT-028: Admin login with admin credentials
    public function test_admin_can_login_and_token_reflects_admin_flag(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'password' => 'adminpass']);

        $response = $this->postJson('/api/login', [
            'email'    => $admin->email,
            'password' => 'adminpass',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['token', 'user'])
                 ->assertJsonPath('user.is_admin', true);
    }
}
