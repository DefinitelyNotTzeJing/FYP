<?php

namespace Tests\Feature\Authors;

use App\Models\Author;
use App\Models\Book;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorTest extends TestCase
{
    use RefreshDatabase;

    // TC-UT-040: View author list
    public function test_anyone_can_list_authors(): void
    {
        Author::factory()->count(3)->create();

        $this->getJson('/api/authors')->assertStatus(200);
    }

    // TC-UT-040b: View author profile with book list
    public function test_anyone_can_view_author_with_books(): void
    {
        $author = Author::factory()->create();

        $this->getJson("/api/authors/{$author->author_id}")
             ->assertStatus(200)
             ->assertJsonFragment(['author_id' => $author->author_id]);
    }

    // TC-UT-038: Admin adds new author
    public function test_admin_can_create_author(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
             ->postJson('/api/authors', ['name' => 'George Orwell', 'bio' => 'British novelist'])
             ->assertStatus(201);

        $this->assertDatabaseHas('authors', ['name' => 'George Orwell']);
    }

    // TC-UT-039: Admin adds author with missing name
    public function test_admin_create_author_fails_with_missing_name(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
             ->postJson('/api/authors', ['bio' => 'Some bio'])
             ->assertStatus(422);
    }

    // TC-UT-041: Admin updates author details
    public function test_admin_can_update_author(): void
    {
        $admin  = User::factory()->create(['is_admin' => true]);
        $author = Author::factory()->create();

        $this->actingAs($admin)
             ->putJson("/api/authors/{$author->author_id}", ['name' => 'Updated Name'])
             ->assertStatus(200);

        $this->assertDatabaseHas('authors', ['author_id' => $author->author_id, 'name' => 'Updated Name']);
    }

    // TC-UT-042: Admin deletes author with no books
    public function test_admin_can_delete_author_without_books(): void
    {
        $admin  = User::factory()->create(['is_admin' => true]);
        $author = Author::factory()->create();

        $this->actingAs($admin)
             ->deleteJson("/api/authors/{$author->author_id}")
             ->assertStatus(200);

        $this->assertDatabaseMissing('authors', ['author_id' => $author->author_id]);
    }

    // TC-UT-043: Admin deletes author with linked books
    public function test_admin_cannot_delete_author_with_books(): void
    {
        $admin  = User::factory()->create(['is_admin' => true]);
        $author = Author::factory()->create();
        Book::factory()->create(['author_id' => $author->author_id]);

        $this->actingAs($admin)
             ->deleteJson("/api/authors/{$author->author_id}")
             ->assertStatus(400);
    }
}
