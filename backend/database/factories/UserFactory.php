<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'username' => fake()->unique()->userName(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the user is an admin.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            // This will be set explicitly after creation for security
        ]);
    }

    /**
     * Configure the model factory after creating the model.
     */
    public function configure(): static
    {
        return $this->afterCreating(function ($user) {
            // Auto-create profile for each user
            $user->profile()->create([
                'date_of_birth' => fake()->dateTimeBetween('-60 years', '-18 years')->format('Y-m-d'),
                'gender' => fake()->randomElement(['M', 'F', 'Other']),
                'phone' => fake()->phoneNumber(),
                'address' => fake()->address(),
            ]);
        });
    }
}