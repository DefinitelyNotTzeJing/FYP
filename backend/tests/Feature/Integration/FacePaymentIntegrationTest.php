<?php

namespace Tests\Feature\Integration;

use App\Models\Book;
use App\Models\Cart;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Integration tests TC-IT-011 to TC-IT-014
 * Face Recognition and Secure Payment Integration
 */
class FacePaymentIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private array $fakeEmbedding;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeEmbedding = array_fill(0, 512, 0.01);
    }

    // TC-IT-011: Full face enrolment to face-verified payment flow
    public function test_TC_IT_011_full_face_enrolment_to_face_verified_payment_flow(): void
    {
        $user = User::factory()->create(['password' => 'secret123']);
        $book = Book::factory()->create(['available_quantity' => 5, 'price' => 30.00]);
        Cart::create(['user_id' => $user->user_id, 'book_id' => $book->book_id, 'quantity' => 1]);

        // Step 1: Enrol face
        Http::fake(['http://127.0.0.1:5000/register' => Http::response([
            'success'   => true,
            'embedding' => $this->fakeEmbedding,
        ], 200)]);

        $this->actingAs($user)
             ->postJson('/api/face/register', ['frames' => array_fill(0, 5, base64_encode('img'))])
             ->assertStatus(200);

        // Step 2: Pay with face
        Http::fake(['http://localhost:5000/verify' => Http::response([
            'success'    => true,
            'match'      => true,
            'similarity' => 0.90,
            'liveness'   => true,
        ], 200)]);

        $response = $this->actingAs($user)
             ->postJson('/api/payment/verify-face', [
                 'frames'           => array_fill(0, 5, base64_encode('img')),
                 'shipping_address' => '123 Test Lane',
                 'payment_method'   => 'Credit Card',
             ]);

        $response->assertStatus(201);
        $this->assertTrue((bool) $response->json('data.order.verified_by_face'));

        // Cart should be cleared
        $this->assertDatabaseMissing('carts', ['user_id' => $user->user_id]);

        // Stock should be decremented
        $this->assertEquals(4, $book->fresh()->available_quantity);
    }

    // TC-IT-012: Face payment rejected for non-matching face embedding
    public function test_TC_IT_012_face_payment_rejected_for_non_matching_face(): void
    {
        $user = User::factory()->create();
        $user->face_embedding    = $this->fakeEmbedding;
        $user->face_registered_at = now();
        $user->save();

        $book = Book::factory()->create(['available_quantity' => 5, 'price' => 20.00]);
        Cart::create(['user_id' => $user->user_id, 'book_id' => $book->book_id, 'quantity' => 1]);

        // Python service returns match = false
        Http::fake(['http://localhost:5000/verify' => Http::response([
            'success'    => false,
            'match'      => false,
            'liveness'   => true,
            'similarity' => 0.25,
            'message'    => 'Face does not match registered user',
        ], 200)]);

        $this->actingAs($user)
             ->postJson('/api/payment/verify-face', [
                 'frames'           => array_fill(0, 5, base64_encode('img')),
                 'shipping_address' => '123 Test Lane',
                 'payment_method'   => 'Credit Card',
             ])
             ->assertStatus(401);

        // Cart should remain unchanged
        $this->assertDatabaseHas('carts', ['user_id' => $user->user_id]);
    }

    // TC-IT-013: Python microservice unavailable during face login
    public function test_TC_IT_013_python_microservice_unavailable_during_face_login(): void
    {
        $user = User::factory()->create();
        $user->face_embedding    = $this->fakeEmbedding;
        $user->face_registered_at = now();
        $user->save();

        // Python service returns 503
        Http::fake(['http://127.0.0.1:5000/verify' => Http::response(
            ['message' => 'Service unavailable'],
            503
        )]);

        $response = $this->postJson('/api/face/verify', [
            'email'  => $user->email,
            'frames' => array_fill(0, 5, base64_encode('img')),
        ]);

        // Controller returns 422 for any non-2xx/non-401 response from the Python service
        $response->assertStatus(422);
        $this->assertNull($response->json('token'));
    }

    // TC-IT-014: Face removal then face login rejected
    public function test_TC_IT_014_face_removal_then_face_login_rejected(): void
    {
        $user = User::factory()->create();
        $user->face_embedding    = $this->fakeEmbedding;
        $user->face_registered_at = now();
        $user->save();

        // Step 1: Remove face data
        $this->actingAs($user)
             ->deleteJson('/api/face/remove')
             ->assertStatus(200);

        $user->refresh();
        $this->assertNull($user->face_embedding);

        // Step 2: Face login should be rejected (face not registered)
        $this->postJson('/api/face/verify', [
            'email'  => $user->email,
            'frames' => array_fill(0, 5, base64_encode('img')),
        ])->assertStatus(400);
    }
}
