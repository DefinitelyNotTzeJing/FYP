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

    public function test_anyone_can_list_authors(): void
    {
        Author::factory()->count(3)->create();

        $this->getJson('/api/authors')->assertStatus(200);
    }

    public function test_anyone_can_view_author_with_books(): void
    {
        $author = Author::factory()->create();

        $this->getJson("/api/authors/{$author->author_id}")
             ->assertStatus(200)
             ->assertJsonFragment(['author_id' => $author->author_id]);
    }

    public function test_admin_can_create_author(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
             ->postJson('/api/authors', ['name' => 'George Orwell', 'bio' => 'British novelist'])
             ->assertStatus(201);

        $this->assertDatabaseHas('authors', ['name' => 'George Orwell']);
    }

    public function test_admin_can_update_author(): void
    {
        $admin  = User::factory()->create(['is_admin' => true]);
        $author = Author::factory()->create();

        $this->actingAs($admin)
             ->putJson("/api/authors/{$author->author_id}", ['name' => 'Updated Name'])
             ->assertStatus(200);

        $this->assertDatabaseHas('authors', ['author_id' => $author->author_id, 'name' => 'Updated Name']);
    }

    public function test_admin_cannot_delete_author_with_books(): void
    {
        $admin  = User::factory()->create(['is_admin' => true]);
        $author = Author::factory()->create();
        Book::factory()->create(['author_id' => $author->author_id]);

        $this->actingAs($admin)
             ->deleteJson("/api/authors/{$author->author_id}")
             ->assertStatus(400);
    }

    public function test_admin_can_delete_author_without_books(): void
    {
        $admin  = User::factory()->create(['is_admin' => true]);
        $author = Author::factory()->create();

        $this->actingAs($admin)
             ->deleteJson("/api/authors/{$author->author_id}")
             ->assertStatus(200);

        $this->assertDatabaseMissing('authors', ['author_id' => $author->author_id]);
    }

    public function test_non_admin_cannot_delete_author(): void
    {
        $user   = User::factory()->create();
        $author = Author::factory()->create();

        $this->actingAs($user)
             ->deleteJson("/api/authors/{$author->author_id}")
             ->assertStatus(403);
    }
}
