<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class AuthorFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->name();
        return [
            'name'      => $name,
            'bio'       => fake()->paragraph(3),
            'image_url' => 'https://ui-avatars.com/api/?name=' . urlencode($name) . '&size=200&background=random&color=fff&bold=true',
        ];
    }
}