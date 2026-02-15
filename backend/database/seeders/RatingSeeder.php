<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Rating;
use App\Models\User;
use App\Models\Book;

class RatingSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::all();
        $books = Book::all();

        // Each book gets 5-20 random ratings from different users
        $books->each(function ($book) use ($users) {
            $numberOfRatings = rand(5, 20);
            $randomUsers = $users->random($numberOfRatings);
            
            foreach ($randomUsers as $user) {
                try {
                    Rating::factory()->create([
                        'user_id' => $user->user_id,
                        'book_id' => $book->book_id,
                    ]);
                } catch (\Exception $e) {
                    // Skip if duplicate (same user rating same book twice)
                    continue;
                }
            }
        });
    }
}