<?php

namespace Tests\Feature\Books;

use App\Models\Author;
use App\Models\Book;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookTest extends TestCase
{
    use RefreshDatabase;

    // ── Index / listing ───────────────────────────────────────────────────────

    public function test_anyone_can_list_books(): void
    {
        Book::factory()->count(3)->create();

        $response = $this->getJson('/api/books')->assertStatus(200);

        // Laravel paginator returns 'data' + pagination fields at the top level
        $this->assertArrayHasKey('data', $response->json());
        $this->assertArrayHasKey('total', $response->json());
    }

    public function test_books_are_paginated_with_default_15_per_page(): void
    {
        Book::factory()->count(20)->create();

        $response = $this->getJson('/api/books');

        $response->assertStatus(200);
        $this->assertCount(15, $response->json('data'));
    }

    public function test_books_can_be_filtered_by_category(): void
    {
        $cat1   = Category::factory()->create();
        $cat2   = Category::factory()->create();
        $author = Author::factory()->create();

        Book::factory()->count(2)->create(['category_id' => $cat1->category_id, 'author_id' => $author->author_id]);
        Book::factory()->count(3)->create(['category_id' => $cat2->category_id, 'author_id' => $author->author_id]);

        // Controller filters by 'category_id' param
        $response = $this->getJson("/api/books?category_id={$cat1->category_id}");

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_books_can_be_filtered_to_featured_only(): void
    {
        Book::factory()->count(2)->featured()->create();
        Book::factory()->count(3)->create(['is_featured' => false]);

        $response = $this->getJson('/api/books?featured=1');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_books_can_be_filtered_to_in_stock_only(): void
    {
        Book::factory()->count(3)->create(['available_quantity' => 5]);
        Book::factory()->count(2)->outOfStock()->create();

        $response = $this->getJson('/api/books?in_stock=1');

        $response->assertStatus(200);
        $this->assertCount(3, $response->json('data'));
    }

    // ── Search ────────────────────────────────────────────────────────────────

    public function test_search_returns_matching_books_by_title(): void
    {
        Book::factory()->create(['book_name' => 'Laravel Testing Guide']);
        Book::factory()->create(['book_name' => 'Unrelated Title']);

        // Controller validates 'query' param (min:2)
        $response = $this->getJson('/api/books/search?query=Laravel');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertStringContainsStringIgnoringCase('Laravel', $data[0]['book_name']);
    }

    public function test_search_with_empty_query_returns_validation_error(): void
    {
        $this->getJson('/api/books/search')->assertStatus(422);
    }

    // ── Show ──────────────────────────────────────────────────────────────────

    public function test_anyone_can_view_a_single_book(): void
    {
        $book = Book::factory()->create();

        $this->getJson("/api/books/{$book->book_id}")
             ->assertStatus(200)
             ->assertJsonFragment(['book_id' => $book->book_id]);
    }

    public function test_returns_404_for_nonexistent_book(): void
    {
        $this->getJson('/api/books/9999')->assertStatus(404);
    }

    // ── Admin CRUD ────────────────────────────────────────────────────────────

    public function test_admin_can_create_book(): void
    {
        $admin    = User::factory()->create(['is_admin' => true]);
        $author   = Author::factory()->create();
        $category = Category::factory()->create();

        $this->actingAs($admin)
             ->postJson('/api/books', [
                 'book_name'          => 'New Book',
                 'author_id'          => $author->author_id,
                 'category_id'        => $category->category_id,
                 'price'              => 29.99,
                 'available_quantity' => 10,
             ])
             ->assertStatus(201);

        $this->assertDatabaseHas('books', ['book_name' => 'New Book']);
    }

    public function test_non_admin_cannot_create_book(): void
    {
        $user     = User::factory()->create();
        $author   = Author::factory()->create();
        $category = Category::factory()->create();

        $this->actingAs($user)
             ->postJson('/api/books', [
                 'book_name'   => 'Hack Book',
                 'author_id'   => $author->author_id,
                 'category_id' => $category->category_id,
                 'price'       => 9.99,
             ])
             ->assertStatus(403);
    }

    public function test_admin_can_update_book(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $book  = Book::factory()->create();

        $this->actingAs($admin)
             ->putJson("/api/books/{$book->book_id}", ['book_name' => 'Updated Title'])
             ->assertStatus(200);

        $this->assertDatabaseHas('books', ['book_id' => $book->book_id, 'book_name' => 'Updated Title']);
    }

    public function test_admin_can_delete_book(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $book  = Book::factory()->create();

        $this->actingAs($admin)
             ->deleteJson("/api/books/{$book->book_id}")
             ->assertStatus(200);

        $this->assertDatabaseMissing('books', ['book_id' => $book->book_id]);
    }
}
