<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Models\Book;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::where('is_admin', false)->get();
        $books = Book::all();

        // 25 random users will have orders
        $users->random(25)->each(function ($user) use ($books) {
            // Each user has 1-4 orders
            $numberOfOrders = rand(1, 4);
            
            for ($i = 0; $i < $numberOfOrders; $i++) {
                // Create order
                $order = Order::factory()->create([
                    'user_id' => $user->user_id,
                ]);

                // Each order has 1-5 books
                $numberOfBooks = rand(1, 5);
                $orderBooks = $books->random($numberOfBooks);
                $total = 0;

                foreach ($orderBooks as $book) {
                    $quantity = rand(1, 3);
                    $price = $book->price;
                    $itemTotal = $quantity * $price;
                    $total += $itemTotal;

                    OrderItem::factory()->create([
                        'order_id' => $order->order_id,
                        'book_id' => $book->book_id,
                        'quantity' => $quantity,
                        'price' => $price,
                        'total' => $itemTotal,
                    ]);
                }

                // Update order total
                $order->update(['total_amount' => $total]);
            }
        });
    }
}