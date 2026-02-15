<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Review;
use App\Models\User;
use App\Models\Book;

class ReviewSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::all();
        $books = Book::all();

        // Create 100 random reviews
        for ($i = 0; $i < 100; $i++) {
            Review::factory()->create([
                'user_id' => $users->random()->user_id,
                'book_id' => $books->random()->book_id,
            ]);
        }
    }
}