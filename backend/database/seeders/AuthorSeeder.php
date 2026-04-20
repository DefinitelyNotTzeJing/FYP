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
                'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/J._K._Rowling_2010.jpg/200px-J._K._Rowling_2010.jpg',
            ],
            [
                'name' => 'Stephen King',
                'bio' => 'American author of horror, supernatural fiction, and fantasy.',
                'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Stephen_King%2C_Comicon.jpg/200px-Stephen_King%2C_Comicon.jpg',
            ],
            [
                'name' => 'Agatha Christie',
                'bio' => 'English writer known for her detective novels.',
                'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Agatha_Christie.png/200px-Agatha_Christie.png',
            ],
            [
                'name' => 'George Orwell',
                'bio' => 'English novelist and essayist, known for 1984 and Animal Farm.',
                'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/George_Orwell_press_photo.jpg/200px-George_Orwell_press_photo.jpg',
            ],
            [
                'name' => 'Jane Austen',
                'bio' => 'English novelist known for her romantic fiction.',
                'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/CassandraAusten-JaneAusten%28c.1810%29_hires.jpg/200px-CassandraAusten-JaneAusten%28c.1810%29_hires.jpg',
            ],
            [
                'name' => 'Mark Twain',
                'bio' => 'American writer and humorist.',
                'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Mark_Twain%2C_1907_crop.jpg/200px-Mark_Twain%2C_1907_crop.jpg',
            ],
            [
                'name' => 'Ernest Hemingway',
                'bio' => 'American novelist and short-story writer.',
                'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/ErnestHemingway.jpg/200px-ErnestHemingway.jpg',
            ],
            [
                'name' => 'Maya Angelou',
                'bio' => 'American poet and civil rights activist.',
                'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Maya_Angelou_visits_YCP_%28cropped%29.jpg/200px-Maya_Angelou_visits_YCP_%28cropped%29.jpg',
            ],
            [
                'name' => 'Isaac Asimov',
                'bio' => 'American writer of science fiction and popular science.',
                'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Isaac.Asimov01.jpg/200px-Isaac.Asimov01.jpg',
            ],
            [
                'name' => 'Neil Gaiman',
                'bio' => 'English author of fantasy and graphic novels.',
                'image_url' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Kyle-cassidy-neil-gaiman-April-2013.jpg/200px-Kyle-cassidy-neil-gaiman-April-2013.jpg',
            ],
        ];

        foreach ($authors as $author) {
            Author::create($author);
        }
        Author::factory(20)->create();
    }
}