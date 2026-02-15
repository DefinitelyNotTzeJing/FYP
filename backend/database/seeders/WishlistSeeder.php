<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Wishlist;
use App\Models\User;
use App\Models\Book;

class WishlistSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::where('is_admin', false)->get();
        $books = Book::all();

        // 20 random users will have wishlists
        $users->random(20)->each(function ($user) use ($books) {
            // Each user has 3-10 books in wishlist
            $numberOfBooks = rand(3, 10);
            $randomBooks = $books->random($numberOfBooks);
            
            foreach ($randomBooks as $book) {
                try {
                    Wishlist::factory()->create([
                        'user_id' => $user->user_id,
                        'book_id' => $book->book_id,
                    ]);
                } catch (\Exception $e) {
                    // Skip if duplicate
                    continue;
                }
            }
        });
    }
}