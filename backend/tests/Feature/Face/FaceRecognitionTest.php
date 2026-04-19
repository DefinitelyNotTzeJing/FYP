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

    // ── Health check ──────────────────────────────────────────────────────────

    public function test_health_check_returns_ok_when_python_api_is_up(): void
    {
        Http::fake(['http://127.0.0.1:5000/health' => Http::response(['status' => 'ok'], 200)]);

        $this->getJson('/api/face/health')->assertStatus(200)->assertJson(['status' => 'ok']);
    }

    public function test_health_check_returns_error_when_python_api_is_down(): void
    {
        Http::fake(['http://127.0.0.1:5000/health' => fn() => throw new \Exception('Connection refused')]);

        $this->getJson('/api/face/health')->assertStatus(500);
    }

    // ── Register ──────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_register_face(): void
    {
        Http::fake(['http://127.0.0.1:5000/register' => Http::response([
            'success'   => true,
            'embedding' => $this->fakeEmbedding,
        ], 200)]);

        $user    = User::factory()->create();
        $frames  = array_fill(0, 5, base64_encode('fake_image'));

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

    public function test_face_embedding_is_stored_encrypted_not_as_plain_json(): void
    {
        Http::fake(['http://127.0.0.1:5000/register' => Http::response([
            'success'   => true,
            'embedding' => $this->fakeEmbedding,
        ], 200)]);

        $user   = User::factory()->create();
        $frames = array_fill(0, 5, base64_encode('fake_image'));

        $this->actingAs($user)->postJson('/api/face/register', ['frames' => $frames]);

        $raw = \DB::table('users')->where('user_id', $user->user_id)->value('face_embedding');

        $this->assertStringStartsWith('eyJ', $raw, 'Embedding should be AES-encrypted (base64 starts with eyJ)');
    }

    public function test_face_registration_requires_at_least_5_frames(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
             ->postJson('/api/face/register', ['frames' => array_fill(0, 4, 'img')])
             ->assertStatus(422);
    }

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

    public function test_unauthenticated_user_cannot_register_face(): void
    {
        $this->postJson('/api/face/register', ['frames' => array_fill(0, 5, 'img')])
             ->assertStatus(401);
    }

    // ── Verify (face login) ───────────────────────────────────────────────────

    public function test_user_can_login_with_matching_face(): void
    {
        Http::fake(['http://127.0.0.1:5000/verify' => Http::response([
            'match'      => true,
            'similarity' => 0.85,
            'liveness'   => true,
        ], 200)]);

        $user = User::factory()->create();
        $user->face_embedding    = $this->fakeEmbedding;
        $user->face_registered_at = now();
        $user->save();

        $this->postJson('/api/face/verify', [
            'email'  => $user->email,
            'frames' => array_fill(0, 5, base64_encode('img')),
        ])
             ->assertStatus(200)
             ->assertJsonStructure(['token', 'user']);
    }

    public function test_login_fails_when_face_does_not_match(): void
    {
        Http::fake(['http://127.0.0.1:5000/verify' => Http::response([
            'match'      => false,
            'similarity' => 0.35,
        ], 401)]);

        $user = User::factory()->create();
        $user->face_embedding = $this->fakeEmbedding;
        $user->save();

        $this->postJson('/api/face/verify', [
            'email'  => $user->email,
            'frames' => array_fill(0, 5, base64_encode('img')),
        ])->assertStatus(401);
    }

    public function test_login_fails_when_face_not_registered(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/face/verify', [
            'email'  => $user->email,
            'frames' => array_fill(0, 5, base64_encode('img')),
        ])->assertStatus(400);
    }

    public function test_login_fails_for_unknown_email(): void
    {
        $this->postJson('/api/face/verify', [
            'email'  => 'ghost@example.com',
            'frames' => array_fill(0, 5, base64_encode('img')),
        ])->assertStatus(404);
    }

    // ── Status / Remove ───────────────────────────────────────────────────────

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

    public function test_face_status_shows_not_registered(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
             ->getJson('/api/face/status')
             ->assertJson(['has_face' => false]);
    }

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
