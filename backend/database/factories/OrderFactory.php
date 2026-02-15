<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'          => 1, // Will be overridden in seeder
            'order_number'     => 'ORD-' . strtoupper(fake()->unique()->bothify('######')),
            'status'           => fake()->randomElement([
                                    'pending', 'processing', 'shipped', 'delivered', 'cancelled'
                                  ]),
            'total_amount'     => fake()->randomFloat(2, 15, 300),
            'shipping_address' => fake()->streetAddress(),
            'shipping_city'    => fake()->city(),
            'shipping_state'   => fake()->state(),
            'shipping_zip'     => fake()->postcode(),
            'shipping_country' => fake()->country(),
            'payment_method'   => fake()->randomElement(['credit_card', 'paypal', 'bank_transfer']),
            'payment_status'   => fake()->randomElement(['pending', 'paid', 'failed']),
            'notes'            => fake()->optional()->sentence(),
        ];
    }
}