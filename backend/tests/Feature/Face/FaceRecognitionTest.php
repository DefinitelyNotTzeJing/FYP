<?php

namespace Tests\Feature\Face;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FaceRecognitionTest extends TestCase
{
    use RefreshDatabase;

    private array $fakeEmbedding;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeEmbedding = array_fill(0, 512, 0.01);
    }

    // TC-UT-006: Face login with valid enrolled face
    public function test_user_can_login_with_matching_face(): void
    {
        Http::fake(['http://127.0.0.1:5000/verify' => Http::response([
            'match'      => true,
            'similarity' => 0.85,
            'liveness'   => true,
        ], 200)]);

        $user = User::factory()->create();
        $user->face_embedding     = $this->fakeEmbedding;
        $user->face_registered_at = now();
        $user->save();

        $this->postJson('/api/face/verify', [
            'email'  => $user->email,
            'frames' => array_fill(0, 5, base64_encode('img')),
        ])
             ->assertStatus(200)
             ->assertJsonStructure(['token', 'user']);
    }

    // TC-UT-007: Face login with face not enrolled
    public function test_login_fails_when_face_not_registered(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/face/verify', [
            'email'  => $user->email,
            'frames' => array_fill(0, 5, base64_encode('img')),
        ])->assertStatus(400);
    }

    // TC-UT-008: Face login with spoofed photo (liveness check failed)
    public function test_login_fails_when_liveness_check_fails(): void
    {
        Http::fake(['http://127.0.0.1:5000/verify' => Http::response([
            'message' => 'Liveness check failed',
        ], 422)]);

        $user = User::factory()->create();
        $user->face_embedding     = $this->fakeEmbedding;
        $user->face_registered_at = now();
        $user->save();

        $this->postJson('/api/face/verify', [
            'email'  => $user->email,
            'frames' => array_fill(0, 5, base64_encode('img')),
        ])->assertStatus(422);
    }

    // TC-UT-009: Face registration fails when Python service rejects liveness
    public function test_face_registration_fails_when_python_returns_error(): void
    {
        Http::fake(['http://127.0.0.1:5000/register' => Http::response(
            ['message' => 'Liveness check failed'],
            422
        )]);

        $user = User::factory()->create();

        $this->actingAs($user)
             ->postJson('/api/face/register', ['frames' => array_fill(0, 5, 'img')])
             ->assertStatus(422);
    }

    // TC-UT-068: Register face with valid 5+ live frames
    public function test_authenticated_user_can_register_face(): void
    {
        Http::fake(['http://127.0.0.1:5000/register' => Http::response([
            'success'   => true,
            'embedding' => $this->fakeEmbedding,
        ], 200)]);

        $user   = User::factory()->create();
        $frames = array_fill(0, 5, base64_encode('fake_image'));

        $this->actingAs($user)
             ->postJson('/api/face/register', ['frames' => $frames])
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        $user->refresh();
        $this->assertNotNull($user->face_embedding);
        $this->assertNotNull($user->face_registered_at);
        $this->assertIsArray($user->face_embedding);
        $this->assertCount(512, $user->face_embedding);
    }

    // TC-UT-069: Register face with fewer than 5 frames
    public function test_face_registration_requires_at_least_5_frames(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
             ->postJson('/api/face/register', ['frames' => array_fill(0, 4, 'img')])
             ->assertStatus(422);
    }

    // TC-UT-070: Check face status for enrolled user
    public function test_face_status_shows_registered(): void
    {
        $user = User::factory()->create();
        $user->face_embedding     = $this->fakeEmbedding;
        $user->face_registered_at = now();
        $user->save();

        $this->actingAs($user)
             ->getJson('/api/face/status')
             ->assertStatus(200)
             ->assertJson(['has_face' => true]);
    }

    // TC-UT-063 / TC-UT-071: Remove face enrolment / Remove face data
    public function test_user_can_remove_face_data(): void
    {
        $user = User::factory()->create();
        $user->face_embedding = $this->fakeEmbedding;
        $user->save();

        $this->actingAs($user)->deleteJson('/api/face/remove')->assertStatus(200);

        $user->refresh();
        $this->assertNull($user->face_embedding);
    }
}
