<?php

namespace Tests\Feature\Integration;

use App\Models\Book;
use App\Models\Cart;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Integration tests TC-IT-005 to TC-IT-010
 * Cart and Order Workflow Integration
 */
class CartOrderWorkflowIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['password' => 'secret123']);
    }

    // TC-IT-005: Browse, add to cart, view cart
    public function test_TC_IT_005_browse_add_to_cart_view_cart(): void
    {
        $book = Book::factory()->create(['available_quantity' => 10]);

        // Step 1: Browse books
        $this->getJson('/api/books')
             ->assertStatus(200)
             ->assertJsonStructure(['data']);

        // Step 2: Add to cart (qty 2)
        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $book->book_id, 'quantity' => 2])
             ->assertStatus(201);

        // Step 3: View cart and confirm book is present
        $cartResponse = $this->actingAs($this->user)->getJson('/api/cart');
        $cartResponse->assertStatus(200);

        $bookIds = collect($cartResponse->json('data'))->pluck('book_id')->toArray();
        $this->assertContains($book->book_id, $bookIds);

        $item = collect($cartResponse->json('data'))->firstWhere('book_id', $book->book_id);
        $this->assertEquals(2, $item['quantity']);
    }

    // TC-IT-006: Add duplicate book to cart merges quantity
    public function test_TC_IT_006_add_duplicate_book_to_cart_merges_quantity(): void
    {
        $book = Book::factory()->create(['available_quantity' => 10]);

        // Add book A qty 2
        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $book->book_id, 'quantity' => 2])
             ->assertStatus(201);

        // Add same book A qty 1
        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $book->book_id, 'quantity' => 1]);

        // Cart should show total quantity 3
        $this->assertDatabaseHas('carts', [
            'user_id'  => $this->user->user_id,
            'book_id'  => $book->book_id,
            'quantity' => 3,
        ]);
    }

    // TC-IT-007: Checkout summary reflects cart contents
    public function test_TC_IT_007_checkout_summary_reflects_cart_contents(): void
    {
        $book = Book::factory()->create(['available_quantity' => 10, 'price' => 45.00]);

        // Add 2 copies (RM 45 × 2 = RM 90 subtotal)
        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $book->book_id, 'quantity' => 2]);

        $response = $this->actingAs($this->user)->getJson('/api/checkout/summary');
        $response->assertStatus(200);

        $subtotal = (float) $response->json('data.pricing.subtotal');
        $this->assertEquals(90.00, $subtotal);
        $this->assertNotNull($response->json('data.pricing.tax'));
        $this->assertNotNull($response->json('data.pricing.total'));
    }

    // TC-IT-008: Cart cleared and stock decremented after order placement
    public function test_TC_IT_008_cart_cleared_and_stock_decremented_after_order_placement(): void
    {
        $book = Book::factory()->create(['available_quantity' => 5, 'price' => 20.00]);

        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $book->book_id, 'quantity' => 2]);

        // Place order
        $this->actingAs($this->user)
             ->postJson('/api/payment/verify-password', [
                 'password'         => 'secret123',
                 'shipping_address' => '123 Test Lane',
                 'payment_method'   => 'Credit Card',
             ])
             ->assertStatus(201);

        // Cart should be empty
        $this->assertDatabaseMissing('carts', ['user_id' => $this->user->user_id]);

        // Stock should be decremented by 2
        $this->assertEquals(3, $book->fresh()->available_quantity);
    }

    // TC-IT-009: Order appears in order history after placement
    public function test_TC_IT_009_order_appears_in_order_history_after_placement(): void
    {
        $book = Book::factory()->create(['available_quantity' => 5, 'price' => 20.00]);

        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $book->book_id, 'quantity' => 1]);

        // Place order
        $this->actingAs($this->user)
             ->postJson('/api/payment/verify-password', [
                 'password'         => 'secret123',
                 'shipping_address' => '123 Test Lane',
                 'payment_method'   => 'Credit Card',
             ])
             ->assertStatus(201);

        // Check order history contains the new order
        $ordersResponse = $this->actingAs($this->user)->getJson('/api/orders');
        $ordersResponse->assertStatus(200);

        $orders = $ordersResponse->json();
        $items = isset($orders['data']) ? $orders['data'] : $orders;
        $this->assertNotEmpty($items);
        // PaymentController creates orders with status = 'processing' after successful payment
        $this->assertContains($items[0]['status'], ['pending', 'processing']);
    }

    // TC-IT-010: Wishlist to cart cross-module flow
    public function test_TC_IT_010_wishlist_to_cart_cross_module_flow(): void
    {
        $book = Book::factory()->create(['available_quantity' => 10]);

        // Add to wishlist
        $this->actingAs($this->user)
             ->postJson('/api/wishlist', ['book_id' => $book->book_id])
             ->assertStatus(201);

        // Add same book to cart
        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $book->book_id, 'quantity' => 1])
             ->assertStatus(201);

        // Remove from wishlist
        $this->actingAs($this->user)
             ->deleteJson("/api/wishlist/{$book->book_id}")
             ->assertStatus(200);

        // Wishlist should be empty
        $this->assertDatabaseMissing('wishlists', [
            'user_id' => $this->user->user_id,
            'book_id' => $book->book_id,
        ]);

        // Cart should still contain the book
        $this->assertDatabaseHas('carts', [
            'user_id' => $this->user->user_id,
            'book_id' => $book->book_id,
        ]);
    }
}
