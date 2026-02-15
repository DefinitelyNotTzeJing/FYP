<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Cart;
use App\Models\User;
use App\Models\Book;

class CartSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::where('is_admin', false)->get(); // Only regular users have carts
        $books = Book::inStock()->get(); // Only books in stock

        // 15 random users will have items in their cart
        $users->random(15)->each(function ($user) use ($books) {
            // Each user has 1-5 books in cart
            $numberOfBooks = rand(1, 5);
            $randomBooks = $books->random($numberOfBooks);
            
            foreach ($randomBooks as $book) {
                try {
                    Cart::factory()->create([
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