<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UserProfile>
 */
class UserProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(), // Auto-create a user if needed
            'profile_image_url' => fake()->imageUrl(200, 200, 'people'),
            'date_of_birth' => fake()->dateTimeBetween('-60 years', '-18 years')->format('Y-m-d'),
            'gender' => fake()->randomElement(['M', 'F', 'Other']),
            'payment_method' => fake()->randomElement(['Credit Card', 'Debit Card', 'PayPal', 'Cash on Delivery']),
            'address' => fake()->address(),
            'phone' => fake()->phoneNumber(),
        ];
    }
}