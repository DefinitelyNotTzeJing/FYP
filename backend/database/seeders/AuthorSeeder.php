<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Author;

class AuthorSeeder extends Seeder
{
    public function run(): void
    {
        $authors = [
            [
                'name' => 'J.K. Rowling',
                'bio' => 'British author, best known for the Harry Potter series.',
                'image_url' => 'https://via.placeholder.com/150'
            ],
            [
                'name' => 'Stephen King',
                'bio' => 'American author of horror, supernatural fiction, and fantasy.',
                'image_url' => 'https://via.placeholder.com/150'
            ],
            [
                'name' => 'Agatha Christie',
                'bio' => 'English writer known for her detective novels.',
                'image_url' => 'https://via.placeholder.com/150'
            ],
            [
                'name' => 'George Orwell',
                'bio' => 'English novelist and essayist, known for 1984 and Animal Farm.',
                'image_url' => 'https://via.placeholder.com/150'
            ],
            [
                'name' => 'Jane Austen',
                'bio' => 'English novelist known for her romantic fiction.',
                'image_url' => 'https://via.placeholder.com/150'
            ],
            [
                'name' => 'Mark Twain',
                'bio' => 'American writer and humorist.',
                'image_url' => 'https://via.placeholder.com/150'
            ],
            [
                'name' => 'Ernest Hemingway',
                'bio' => 'American novelist and short-story writer.',
                'image_url' => 'https://via.placeholder.com/150'
            ],
            [
                'name' => 'Maya Angelou',
                'bio' => 'American poet and civil rights activist.',
                'image_url' => 'https://via.placeholder.com/150'
            ],
            [
                'name' => 'Isaac Asimov',
                'bio' => 'American writer of science fiction and popular science.',
                'image_url' => 'https://via.placeholder.com/150'
            ],
            [
                'name' => 'Neil Gaiman',
                'bio' => 'English author of fantasy and graphic novels.',
                'image_url' => 'https://via.placeholder.com/150'
            ],
        ];

        foreach ($authors as $author) {
            Author::create($author);
        }
        Author::factory(20)->create();
    }
}