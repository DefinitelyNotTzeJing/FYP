<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Fiction',
                'slug' => 'fiction',
                'description' => 'Fictional novels and stories'
            ],
            [
                'name' => 'Non-Fiction',
                'slug' => 'non-fiction',
                'description' => 'Real-life stories and factual books'
            ],
            [
                'name' => 'Mystery',
                'slug' => 'mystery',
                'description' => 'Mystery and thriller books'
            ],
            [
                'name' => 'Romance',
                'slug' => 'romance',
                'description' => 'Love stories and romantic novels'
            ],
            [
                'name' => 'Science Fiction',
                'slug' => 'sci-fi',
                'description' => 'Science fiction and futuristic stories'
            ],
            [
                'name' => 'Biography',
                'slug' => 'biography',
                'description' => 'Life stories of real people'
            ],
            [
                'name' => 'Self-Help',
                'slug' => 'self-help',
                'description' => 'Personal development and improvement'
            ],
            [
                'name' => 'History',
                'slug' => 'history',
                'description' => 'Historical events and periods'
            ],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}