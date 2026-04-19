<?php

namespace Tests\Feature\Payment;

use App\Models\Book;
use App\Models\Cart;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Book $book;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['password' => 'secret123']);
        $this->book = Book::factory()->create(['available_quantity' => 10, 'price' => 25.00]);
        Cart::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'quantity' => 2]);
    }

    // ── Checkout summary ──────────────────────────────────────────────────────

    public function test_checkout_summary_includes_correct_pricing(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/checkout/summary');

        // Response: { success, data: { items, pricing: { subtotal, ... }, user, available_authentication_methods } }
        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['items', 'pricing' => ['subtotal', 'shipping', 'tax', 'total']]]);

        $pricing = $response->json('data.pricing');
        $this->assertEquals(50.00, (float) $pricing['subtotal']);
    }

    public function test_checkout_summary_shows_face_auth_only_when_registered(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/checkout/summary');

        $methods = $response->json('data.available_authentication_methods');
        $this->assertFalse($methods['facial_recognition'] ?? false);
    }

    // ── Password payment ──────────────────────────────────────────────────────

    public function test_user_can_pay_with_correct_password(): void
    {
        // Field is 'password' (not 'current_password'); enum must match exactly
        $response = $this->actingAs($this->user)
                         ->postJson('/api/payment/verify-password', [
                             'password'         => 'secret123',
                             'shipping_address' => '123 Test Lane',
                             'payment_method'   => 'Credit Card',
                         ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['data' => ['order' => ['order_number', 'total_amount']]]);
    }

    public function test_password_payment_fails_with_wrong_password(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/payment/verify-password', [
                 'password'         => 'wrongpass',
                 'shipping_address' => '123 Test Lane',
                 'payment_method'   => 'Credit Card',
             ])
             ->assertStatus(401);
    }

    public function test_password_payment_fails_with_empty_cart(): void
    {
        Cart::where('user_id', $this->user->user_id)->delete();

        $this->actingAs($this->user)
             ->postJson('/api/payment/verify-password', [
                 'password'         => 'secret123',
                 'shipping_address' => '123 Test Lane',
                 'payment_method'   => 'Credit Card',
             ])
             ->assertStatus(400);
    }

    public function test_successful_password_payment_clears_cart(): void
    {
        $this->actingAs($this->user)->postJson('/api/payment/verify-password', [
            'password'         => 'secret123',
            'shipping_address' => '123 Test Lane',
            'payment_method'   => 'Credit Card',
        ]);

        $this->assertDatabaseMissing('carts', ['user_id' => $this->user->user_id]);
    }

    public function test_successful_password_payment_decrements_stock(): void
    {
        $this->actingAs($this->user)->postJson('/api/payment/verify-password', [
            'password'         => 'secret123',
            'shipping_address' => '123 Test Lane',
            'payment_method'   => 'Credit Card',
        ]);

        $this->assertEquals(8, $this->book->fresh()->available_quantity);
    }

    // ── Face payment ──────────────────────────────────────────────────────────

    public function test_user_can_pay_with_matching_face(): void
    {
        // Controller checks $result['success'] — must include that key
        Http::fake(['http://localhost:5000/verify' => Http::response([
            'success'    => true,
            'match'      => true,
            'similarity' => 0.88,
            'liveness'   => true,
        ], 200)]);

        $this->user->face_embedding     = array_fill(0, 512, 0.01);
        $this->user->face_registered_at = now();
        $this->user->save();

        $this->actingAs($this->user)
             ->postJson('/api/payment/verify-face', [
                 'frames'           => array_fill(0, 5, base64_encode('img')),
                 'shipping_address' => '123 Test Lane',
                 'payment_method'   => 'Credit Card',
             ])
             ->assertStatus(201)
             ->assertJsonStructure(['data' => ['order']]);
    }

    public function test_face_payment_fails_when_face_does_not_match(): void
    {
        // Python service returns HTTP 200 with success:false when match fails
        // (HTTP non-2xx would be caught as 503 "service unavailable" by the controller)
        Http::fake(['http://localhost:5000/verify' => Http::response([
            'success'    => false,
            'match'      => false,
            'liveness'   => true,
            'similarity' => 0.30,
            'message'    => 'Face does not match registered user',
        ], 200)]);

        $this->user->face_embedding = array_fill(0, 512, 0.01);
        $this->user->save();

        $this->actingAs($this->user)
             ->postJson('/api/payment/verify-face', [
                 'frames'           => array_fill(0, 5, base64_encode('img')),
                 'shipping_address' => '123 Test Lane',
                 'payment_method'   => 'Credit Card',
             ])
             ->assertStatus(401);
    }

    public function test_face_payment_fails_when_face_not_registered(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/payment/verify-face', [
                 'frames'           => array_fill(0, 5, base64_encode('img')),
                 'shipping_address' => '123 Test Lane',
                 'payment_method'   => 'Credit Card',
             ])
             ->assertStatus(400);
    }
}
