<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class BookFactory extends Factory
{
    public function definition(): array
    {
        $categories = ['fiction', 'non-fiction', 'mystery', 'romance', 'sci-fi', 'biography'];
        $price = fake()->randomFloat(2, 9.99, 99.99);

        return [
            'title'          => fake()->sentence(fake()->numberBetween(2, 5)),
            'author'         => fake()->name(),
            'isbn'           => fake()->unique()->isbn13(),
            'description'    => fake()->paragraph(3),
            'price'          => $price,
            'discount'       => fake()->randomElement([0, 0, 0, 5, 10, 15, 20]),
            'stock_quantity' => fake()->numberBetween(0, 100),
            'cover_image'    => 'https://picsum.photos/seed/' . fake()->word() . '/200/300',
            'category'       => fake()->randomElement($categories),
            'publisher'      => fake()->company(),
            'published_date' => fake()->dateTimeBetween('-10 years', 'now'),
            'pages'          => fake()->numberBetween(100, 800),
            'language'       => 'English',
            'rating'         => fake()->randomFloat(1, 3.0, 5.0),
            'reviews_count'  => fake()->numberBetween(0, 500),
            'featured'       => fake()->boolean(20), // 20% chance of being featured
        ];
    }
}