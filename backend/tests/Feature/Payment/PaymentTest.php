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

    // TC-UT-021: Get checkout summary with valid cart
    public function test_checkout_summary_includes_correct_pricing(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/checkout/summary');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['items', 'pricing' => ['subtotal', 'shipping', 'tax', 'total']]]);

        $pricing = $response->json('data.pricing');
        $this->assertEquals(50.00, (float) $pricing['subtotal']);
    }

    // TC-UT-022: Place order with standard payment (password)
    public function test_user_can_pay_with_correct_password(): void
    {
        $response = $this->actingAs($this->user)
                         ->postJson('/api/payment/verify-password', [
                             'password'         => 'secret123',
                             'shipping_address' => '123 Test Lane',
                             'payment_method'   => 'Credit Card',
                         ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['data' => ['order' => ['order_number', 'total_amount']]]);
    }

    // TC-UT-023: Place order with face payment
    public function test_user_can_pay_with_matching_face(): void
    {
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
}
