<?php

namespace Database\Factories;

use App\Models\Author;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookFactory extends Factory
{
    public function definition(): array
    {
        return [
            'book_name' => fake()->sentence(3),
            'book_description' => fake()->paragraph(3),
            'author_id' => Author::factory(),
            'category_id' => Category::factory(),
            'cover_image_url' => fake()->imageUrl(300, 400, 'books'),
            'price' => fake()->randomFloat(2, 9.99, 99.99),
            'available_quantity' => fake()->numberBetween(0, 100),
            'book_total_rating' => fake()->randomFloat(2, 0, 5),
            'book_number_of_rating' => fake()->numberBetween(0, 500),
            'is_featured' => fake()->boolean(70), // 70% chance of being featured
        ];
    }

    /**
     * Create a featured book
     */
    public function featured(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_featured' => true,
        ]);
    }

    /**
     * Create an out-of-stock book
     */
    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'available_quantity' => 0,
        ]);
    }

    /**
     * Create a highly-rated book
     */
    public function highlyRated(): static
    {
        return $this->state(fn (array $attributes) => [
            'book_total_rating' => fake()->randomFloat(2, 4.5, 5.0),
            'book_number_of_rating' => fake()->numberBetween(100, 1000),
        ]);
    }
}