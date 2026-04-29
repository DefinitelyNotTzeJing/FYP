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

    // TC-UT-011 / TC-UT-031: View paginated book listing
    public function test_anyone_can_list_books(): void
    {
        Book::factory()->count(3)->create();

        $response = $this->getJson('/api/books')->assertStatus(200);

        $this->assertArrayHasKey('data', $response->json());
        $this->assertArrayHasKey('total', $response->json());
    }

    // TC-UT-012 / TC-UT-036: Search book by keyword
    public function test_search_returns_matching_books_by_title(): void
    {
        Book::factory()->create(['book_name' => 'Laravel Testing Guide']);
        Book::factory()->create(['book_name' => 'Unrelated Title']);

        $response = $this->getJson('/api/books/search?query=Laravel');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertStringContainsStringIgnoringCase('Laravel', $data[0]['book_name']);
    }

    // TC-UT-013: Search book with no match
    public function test_search_returns_empty_when_no_books_match(): void
    {
        Book::factory()->create(['book_name' => 'Normal Book']);

        $response = $this->getJson('/api/books/search?query=xyznotfound');

        $response->assertStatus(200);
        $this->assertEmpty($response->json('data'));
    }

    // TC-UT-014 / TC-UT-032: View book detail
    public function test_anyone_can_view_a_single_book(): void
    {
        $book = Book::factory()->create();

        $this->getJson("/api/books/{$book->book_id}")
             ->assertStatus(200)
             ->assertJsonFragment(['book_id' => $book->book_id]);
    }

    // TC-UT-015 / TC-UT-037: Filter books by category
    public function test_books_can_be_filtered_by_category(): void
    {
        $cat1   = Category::factory()->create();
        $cat2   = Category::factory()->create();
        $author = Author::factory()->create();

        Book::factory()->count(2)->create(['category_id' => $cat1->category_id, 'author_id' => $author->author_id]);
        Book::factory()->count(3)->create(['category_id' => $cat2->category_id, 'author_id' => $author->author_id]);

        $response = $this->getJson("/api/books?category_id={$cat1->category_id}");

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    // TC-UT-029: Admin adds new book with valid data
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

    // TC-UT-030: Admin adds book with missing required fields
    public function test_admin_create_book_fails_with_missing_required_fields(): void
    {
        $admin  = User::factory()->create(['is_admin' => true]);
        $author = Author::factory()->create();

        $this->actingAs($admin)
             ->postJson('/api/books', [
                 'book_name' => 'Incomplete Book',
                 'author_id' => $author->author_id,
                 // price omitted
             ])
             ->assertStatus(422);
    }

    // TC-UT-033: Admin updates book price and quantity
    public function test_admin_can_update_book(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $book  = Book::factory()->create();

        $this->actingAs($admin)
             ->putJson("/api/books/{$book->book_id}", ['book_name' => 'Updated Title'])
             ->assertStatus(200);

        $this->assertDatabaseHas('books', ['book_id' => $book->book_id, 'book_name' => 'Updated Title']);
    }

    // TC-UT-034: Admin deletes book
    public function test_admin_can_delete_book(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $book  = Book::factory()->create();

        $this->actingAs($admin)
             ->deleteJson("/api/books/{$book->book_id}")
             ->assertStatus(200);

        $this->assertDatabaseMissing('books', ['book_id' => $book->book_id]);
    }

    // TC-UT-035: Non-admin attempts to add book
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
}
