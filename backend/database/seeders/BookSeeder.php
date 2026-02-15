<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Book;
use App\Models\Author;
use App\Models\Category;

class BookSeeder extends Seeder
{
    public function run(): void
    {
        $books = [
            [
                'book_name' => 'Harry Potter and the Philosopher\'s Stone',
                'book_description' => 'A young wizard discovers his magical heritage.',
                'author_name' => 'J.K. Rowling',
                'category_slug' => 'fiction',
                'price' => 29.99,
                'available_quantity' => 50,
                'is_featured' => true,
            ],
            [
                'book_name' => 'The Shining',
                'book_description' => 'A family heads to an isolated hotel for the winter.',
                'author_name' => 'Stephen King',
                'category_slug' => 'mystery',
                'price' => 24.99,
                'available_quantity' => 30,
                'is_featured' => true,
            ],
            [
                'book_name' => 'Murder on the Orient Express',
                'book_description' => 'A murder mystery on a famous train.',
                'author_name' => 'Agatha Christie',
                'category_slug' => 'mystery',
                'price' => 19.99,
                'available_quantity' => 40,
                'is_featured' => false,
            ],
            [
                'book_name' => '1984',
                'book_description' => 'A dystopian social science fiction novel.',
                'author_name' => 'George Orwell',
                'category_slug' => 'fiction',
                'price' => 22.99,
                'available_quantity' => 60,
                'is_featured' => true,
            ],
            [
                'book_name' => 'Pride and Prejudice',
                'book_description' => 'A romantic novel of manners.',
                'author_name' => 'Jane Austen',
                'category_slug' => 'romance',
                'price' => 18.99,
                'available_quantity' => 45,
                'is_featured' => false,
            ],
            [
                'book_name' => 'The Adventures of Tom Sawyer',
                'book_description' => 'A young boy growing up along the Mississippi River.',
                'author_name' => 'Mark Twain',
                'category_slug' => 'fiction',
                'price' => 16.99,
                'available_quantity' => 35,
                'is_featured' => false,
            ],
            [
                'book_name' => 'The Old Man and the Sea',
                'book_description' => 'A story of an aging fisherman.',
                'author_name' => 'Ernest Hemingway',
                'category_slug' => 'fiction',
                'price' => 21.99,
                'available_quantity' => 25,
                'is_featured' => false,
            ],
            [
                'book_name' => 'I Know Why the Caged Bird Sings',
                'book_description' => 'An autobiography of Maya Angelou.',
                'author_name' => 'Maya Angelou',
                'category_slug' => 'biography',
                'price' => 23.99,
                'available_quantity' => 30,
                'is_featured' => true,
            ],
            [
                'book_name' => 'Foundation',
                'book_description' => 'A science fiction novel about the future of humanity.',
                'author_name' => 'Isaac Asimov',
                'category_slug' => 'sci-fi',
                'price' => 26.99,
                'available_quantity' => 40,
                'is_featured' => true,
            ],
            [
                'book_name' => 'American Gods',
                'book_description' => 'A fantasy novel about old and new gods.',
                'author_name' => 'Neil Gaiman',
                'category_slug' => 'fiction',
                'price' => 27.99,
                'available_quantity' => 50,
                'is_featured' => true,
            ],
            [
                'book_name' => 'The Stand',
                'book_description' => 'A post-apocalyptic horror fantasy novel.',
                'author_name' => 'Stephen King',
                'category_slug' => 'sci-fi',
                'price' => 28.99,
                'available_quantity' => 20,
                'is_featured' => false,
            ],
            [
                'book_name' => 'And Then There Were None',
                'book_description' => 'Ten strangers are invited to an island.',
                'author_name' => 'Agatha Christie',
                'category_slug' => 'mystery',
                'price' => 20.99,
                'available_quantity' => 55,
                'is_featured' => false,
            ],
        ];

        foreach ($books as $bookData) {
            $author = Author::where('name', $bookData['author_name'])->first();
            $category = Category::where('slug', $bookData['category_slug'])->first();

            Book::create([
                'book_name' => $bookData['book_name'],
                'book_description' => $bookData['book_description'],
                'author_id' => $author->author_id,
                'category_id' => $category->category_id,
                'cover_image_url' => 'https://via.placeholder.com/300x400',
                'price' => $bookData['price'],
                'available_quantity' => $bookData['available_quantity'],
                'is_featured' => $bookData['is_featured'],
            ]);
        }
        // ===== PART 2: Use Factory to create random books =====
        
        // Get all existing authors and categories
        $authors = Author::all();
        $categories = Category::all();

        // Create 50 random books using existing authors and categories
        Book::factory(50)->create()->each(function ($book) use ($authors, $categories) {
            $book->update([
                'author_id' => $authors->random()->author_id,
                'category_id' => $categories->random()->category_id,
            ]);
        });

        // Create 10 featured books
        Book::factory(10)->featured()->create()->each(function ($book) use ($authors, $categories) {
            $book->update([
                'author_id' => $authors->random()->author_id,
                'category_id' => $categories->random()->category_id,
            ]);
        });

        // Create 5 highly-rated featured books
        Book::factory(5)->featured()->highlyRated()->create()->each(function ($book) use ($authors, $categories) {
            $book->update([
                'author_id' => $authors->random()->author_id,
                'category_id' => $categories->random()->category_id,
            ]);
        });
    }
}