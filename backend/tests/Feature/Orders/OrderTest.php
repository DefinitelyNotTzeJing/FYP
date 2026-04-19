<?php

namespace Tests\Feature\Orders;

use App\Models\Book;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // ── Create order (POST /api/orders takes explicit items array) ────────────

    public function test_user_can_create_order_from_items(): void
    {
        $book = Book::factory()->create(['available_quantity' => 5, 'price' => 30.00]);

        $response = $this->actingAs($this->user)
                         ->postJson('/api/orders', [
                             'items'            => [['book_id' => $book->book_id, 'quantity' => 2]],
                             'shipping_address' => '123 Test Street',
                             'payment_method'   => 'Credit Card',
                         ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['order' => ['order_number', 'total_amount']]);
    }

    public function test_order_decrements_book_stock(): void
    {
        $book = Book::factory()->create(['available_quantity' => 10]);

        $this->actingAs($this->user)->postJson('/api/orders', [
            'items'            => [['book_id' => $book->book_id, 'quantity' => 3]],
            'shipping_address' => '123 Test Street',
            'payment_method'   => 'Credit Card',
        ]);

        $this->assertEquals(7, $book->fresh()->available_quantity);
    }

    public function test_order_fails_when_items_empty(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/orders', [
                 'items'            => [],
                 'shipping_address' => '123 Test Street',
                 'payment_method'   => 'Credit Card',
             ])
             ->assertStatus(422);
    }

    public function test_order_fails_when_stock_is_insufficient(): void
    {
        $book = Book::factory()->create(['available_quantity' => 1]);

        $this->actingAs($this->user)
             ->postJson('/api/orders', [
                 'items'            => [['book_id' => $book->book_id, 'quantity' => 5]],
                 'shipping_address' => '123 Test Street',
                 'payment_method'   => 'Credit Card',
             ])
             ->assertStatus(400);
    }

    // ── Retrieve orders ───────────────────────────────────────────────────────

    public function test_user_can_list_own_orders(): void
    {
        $order = Order::create([
            'user_id'          => $this->user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50,
            'shipping_address' => 'Test',
        ]);

        $this->actingAs($this->user)
             ->getJson('/api/orders')
             ->assertStatus(200)
             ->assertJsonFragment(['order_number' => $order->order_number]);
    }

    public function test_user_cannot_see_another_users_order(): void
    {
        $other = User::factory()->create();
        $order = Order::create([
            'user_id'          => $other->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50,
            'shipping_address' => 'Test',
        ]);

        $this->actingAs($this->user)
             ->getJson("/api/orders/{$order->order_id}")
             ->assertStatus(404);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    public function test_admin_can_list_all_orders(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        Order::create([
            'user_id'          => $this->user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50,
            'shipping_address' => 'Test',
        ]);

        $this->actingAs($admin)
             ->getJson('/api/admin/orders')
             ->assertStatus(200);
    }

    public function test_admin_can_update_order_status(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $order = Order::create([
            'user_id'          => $this->user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50,
            'shipping_address' => 'Test',
        ]);

        $this->actingAs($admin)
             ->putJson("/api/admin/orders/{$order->order_id}/status", [
                 'status' => 'processing',
             ])
             ->assertStatus(200);

        $this->assertEquals('processing', $order->fresh()->status);
    }

    public function test_non_admin_cannot_access_admin_order_routes(): void
    {
        $this->actingAs($this->user)
             ->getJson('/api/admin/orders')
             ->assertStatus(403);
    }
}
