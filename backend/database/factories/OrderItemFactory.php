<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Book;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderItemFactory extends Factory
{
    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 5);
        $price = fake()->randomFloat(2, 10, 100);
        
        return [
            'order_id' => Order::factory(),
            'book_id' => Book::factory(),
            'quantity' => $quantity,
            'price' => $price,
            'total' => $quantity * $price,
        ];
    }
}