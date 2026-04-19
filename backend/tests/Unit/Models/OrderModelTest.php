<?php

namespace Tests\Unit\Models;

use App\Models\Book;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_generate_order_number_returns_unique_string(): void
    {
        $n1 = Order::generateOrderNumber();
        $n2 = Order::generateOrderNumber();

        $this->assertStringStartsWith('ORD-', $n1);
        $this->assertNotEquals($n1, $n2);
    }

    public function test_order_number_format_is_correct(): void
    {
        $number = Order::generateOrderNumber();
        $this->assertMatchesRegularExpression('/^ORD-[A-F0-9]+$/i', $number);
    }

    public function test_get_total_items_attribute_counts_distinct_items(): void
    {
        $order = $this->createOrderWithItems(3);

        $this->assertEquals(3, $order->total_items);
    }

    public function test_get_total_quantity_attribute_sums_quantities(): void
    {
        $user  = User::factory()->create();
        $order = Order::create([
            'user_id'          => $user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 100,
            'shipping_address' => 'Test Address',
        ]);

        $book1 = Book::factory()->create();
        $book2 = Book::factory()->create();

        OrderItem::create(['order_id' => $order->order_id, 'book_id' => $book1->book_id, 'quantity' => 2, 'price' => 10, 'total' => 20]);
        OrderItem::create(['order_id' => $order->order_id, 'book_id' => $book2->book_id, 'quantity' => 3, 'price' => 10, 'total' => 30]);

        $this->assertEquals(5, $order->total_quantity);
    }

    public function test_scope_paid_filters_correctly(): void
    {
        $user = User::factory()->create();
        $this->createOrder($user, ['payment_status' => 'paid']);
        $this->createOrder($user, ['payment_status' => 'pending']);

        $paid = Order::paid()->get();

        $this->assertTrue($paid->every(fn($o) => $o->payment_status === 'paid'));
        $this->assertEquals(1, $paid->count());
    }

    public function test_scope_verified_by_face_filters_correctly(): void
    {
        $user = User::factory()->create();
        $this->createOrder($user, ['verified_by_face' => true]);
        $this->createOrder($user, ['verified_by_face' => false]);

        $faceVerified = Order::verifiedByFace()->get();

        $this->assertEquals(1, $faceVerified->count());
        $this->assertTrue($faceVerified->first()->verified_by_face);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function createOrderWithItems(int $count): Order
    {
        $user  = User::factory()->create();
        $order = $this->createOrder($user);

        for ($i = 0; $i < $count; $i++) {
            $book = Book::factory()->create();
            OrderItem::create([
                'order_id' => $order->order_id,
                'book_id'  => $book->book_id,
                'quantity' => 1,
                'price'    => $book->price,
                'total'    => $book->price,
            ]);
        }

        return $order;
    }

    private function createOrder(User $user, array $attrs = []): Order
    {
        return Order::create(array_merge([
            'user_id'          => $user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50.00,
            'shipping_address' => '123 Test St',
        ], $attrs));
    }
}
