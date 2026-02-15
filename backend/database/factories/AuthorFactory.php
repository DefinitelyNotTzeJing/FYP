<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class AuthorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'bio' => fake()->paragraph(3),
            'image_url' => fake()->imageUrl(150, 150, 'people'),
        ];
    }
}