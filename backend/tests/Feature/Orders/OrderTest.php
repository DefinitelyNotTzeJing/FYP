<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user  = User::factory()->create();
        $this->admin = User::factory()->create(['is_admin' => true]);
    }

    // TC-UT-024: View order history
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

    // TC-UT-025: View specific order detail
    public function test_user_can_view_specific_order_detail(): void
    {
        $order = Order::create([
            'user_id'          => $this->user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50,
            'shipping_address' => 'Test',
        ]);

        $this->actingAs($this->user)
             ->getJson("/api/orders/{$order->order_id}")
             ->assertStatus(200)
             ->assertJsonFragment(['order_number' => $order->order_number]);
    }

    // TC-UT-050: Admin views all orders
    public function test_admin_can_list_all_orders(): void
    {
        Order::create([
            'user_id'          => $this->user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50,
            'shipping_address' => 'Test',
        ]);

        $this->actingAs($this->admin)
             ->getJson('/api/admin/orders')
             ->assertStatus(200);
    }

    // TC-UT-051: Admin filters orders by status
    public function test_admin_can_filter_orders_by_status(): void
    {
        Order::create([
            'user_id'          => $this->user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50,
            'shipping_address' => 'Test',
            'status'           => 'processing',
        ]);
        Order::create([
            'user_id'          => $this->user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 30,
            'shipping_address' => 'Test',
            'status'           => 'pending',
        ]);

        $response = $this->actingAs($this->admin)
             ->getJson('/api/admin/orders?status=processing')
             ->assertStatus(200);

        $orders = $response->json('data') ?? $response->json();
        foreach ($orders as $order) {
            $this->assertEquals('processing', $order['status']);
        }
    }

    // TC-UT-052: Admin updates order status to processing
    public function test_admin_can_update_order_status(): void
    {
        $order = Order::create([
            'user_id'          => $this->user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50,
            'shipping_address' => 'Test',
        ]);

        $this->actingAs($this->admin)
             ->putJson("/api/admin/orders/{$order->order_id}/status", ['status' => 'processing'])
             ->assertStatus(200);

        $this->assertEquals('processing', $order->fresh()->status);
    }

    // TC-UT-053: Admin updates order status with invalid value
    public function test_admin_update_order_status_fails_with_invalid_status(): void
    {
        $order = Order::create([
            'user_id'          => $this->user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50,
            'shipping_address' => 'Test',
        ]);

        $this->actingAs($this->admin)
             ->putJson("/api/admin/orders/{$order->order_id}/status", ['status' => 'unknown'])
             ->assertStatus(422);
    }
}
