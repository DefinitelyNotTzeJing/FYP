<?php

namespace Tests\Feature\Integration;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Integration tests TC-IT-001 to TC-IT-004
 * Authentication and Session Integration
 */
class AuthSessionIntegrationTest extends TestCase
{
    use RefreshDatabase;

    // TC-IT-001: Full registration then password login flow
    public function test_TC_IT_001_full_registration_then_password_login_flow(): void
    {
        // Step 1: Register
        $registerResponse = $this->postJson('/api/register', [
            'email'                 => 'newuser@example.com',
            'username'              => 'newuser',
            'password'              => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);
        $registerResponse->assertStatus(201);

        // Step 2: Login with same credentials
        $loginResponse = $this->postJson('/api/login', [
            'email'    => 'newuser@example.com',
            'password' => 'Password1!',
        ]);
        $loginResponse->assertStatus(200)->assertJsonStructure(['token', 'user']);

        // Step 3: Use token to fetch authenticated user
        $token = $loginResponse->json('token');
        $this->withToken($token)
             ->getJson('/api/user')
             ->assertStatus(200)
             ->assertJsonFragment(['email' => 'newuser@example.com']);
    }

    // TC-IT-002: Registration, face enrolment, then face login flow
    public function test_TC_IT_002_registration_face_enrolment_then_face_login_flow(): void
    {
        $fakeEmbedding = array_fill(0, 512, 0.01);

        // Step 1: Register and get token
        $loginResponse = $this->postJson('/api/login', [
            'email'    => User::factory()->create(['password' => 'Password1!'])->email,
            'password' => 'Password1!',
        ]);
        $token = $loginResponse->json('token');
        $userEmail = $loginResponse->json('user.email');

        // Step 2: Enrol face
        Http::fake(['http://127.0.0.1:5000/register' => Http::response([
            'success'   => true,
            'embedding' => $fakeEmbedding,
        ], 200)]);

        $this->withToken($token)
             ->postJson('/api/face/register', ['frames' => array_fill(0, 5, base64_encode('img'))])
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        // Step 3: Face login
        Http::fake(['http://127.0.0.1:5000/verify' => Http::response([
            'match'      => true,
            'similarity' => 0.88,
            'liveness'   => true,
        ], 200)]);

        $this->postJson('/api/face/verify', [
            'email'  => $userEmail,
            'frames' => array_fill(0, 5, base64_encode('img')),
        ])
             ->assertStatus(200)
             ->assertJsonStructure(['token', 'user']);
    }

    // TC-IT-003: Token invalidated after logout
    public function test_TC_IT_003_token_invalidated_after_logout(): void
    {
        $user  = User::factory()->create(['password' => 'Password1!']);
        $token = $user->createToken('test')->plainTextToken;

        // Step 1: Confirm token works
        $this->withToken($token)->getJson('/api/user')->assertStatus(200);

        // Step 2: Logout – deletes currentAccessToken() from personal_access_tokens
        $this->withToken($token)->postJson('/api/logout')->assertStatus(200);

        // Step 3: Token record is gone from the database (token is revoked)
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->user_id,
        ]);
    }

    // TC-IT-004: Password change revokes all existing tokens
    public function test_TC_IT_004_password_change_revokes_all_existing_tokens(): void
    {
        $user   = User::factory()->create(['password' => 'original123']);
        $tokenA = $user->createToken('tokenA')->plainTextToken;

        // Step 1: Confirm token A exists in the database
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->user_id,
        ]);

        // Step 2: Change password – controller deletes all tokens for this user
        $this->actingAs($user)->postJson('/api/password/change', [
            'current_password'      => 'original123',
            'password'              => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ])->assertStatus(200);

        // Step 3: All tokens for this user are revoked (deleted from database)
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->user_id,
        ]);
    }
}
