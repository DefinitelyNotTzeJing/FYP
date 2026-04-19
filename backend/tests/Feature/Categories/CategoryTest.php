<?php

namespace Tests\Feature\Categories;

use App\Models\Book;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_anyone_can_list_categories(): void
    {
        Category::factory()->count(3)->create();

        $this->getJson('/api/categories')
             ->assertStatus(200)
             ->assertJsonCount(3);
    }

    public function test_anyone_can_view_category_with_books(): void
    {
        $category = Category::factory()->create();

        $this->getJson("/api/categories/{$category->category_id}")
             ->assertStatus(200)
             ->assertJsonFragment(['category_id' => $category->category_id]);
    }

    public function test_admin_can_create_category(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
             ->postJson('/api/categories', ['name' => 'Science Fiction', 'description' => 'Sci-fi books'])
             ->assertStatus(201);

        $this->assertDatabaseHas('categories', ['name' => 'Science Fiction']);
    }

    public function test_slug_is_auto_generated_from_name(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->postJson('/api/categories', ['name' => 'Mystery Thrillers']);

        $this->assertDatabaseHas('categories', ['slug' => 'mystery-thrillers']);
    }

    public function test_admin_can_update_category(): void
    {
        $admin    = User::factory()->create(['is_admin' => true]);
        $category = Category::factory()->create();

        $this->actingAs($admin)
             ->putJson("/api/categories/{$category->category_id}", ['name' => 'Updated Name'])
             ->assertStatus(200);

        $this->assertDatabaseHas('categories', ['category_id' => $category->category_id, 'name' => 'Updated Name']);
    }

    public function test_admin_cannot_delete_category_with_books(): void
    {
        $admin    = User::factory()->create(['is_admin' => true]);
        $category = Category::factory()->create();
        Book::factory()->create(['category_id' => $category->category_id]);

        $this->actingAs($admin)
             ->deleteJson("/api/categories/{$category->category_id}")
             ->assertStatus(400);
    }

    public function test_admin_can_delete_empty_category(): void
    {
        $admin    = User::factory()->create(['is_admin' => true]);
        $category = Category::factory()->create();

        $this->actingAs($admin)
             ->deleteJson("/api/categories/{$category->category_id}")
             ->assertStatus(200);

        $this->assertDatabaseMissing('categories', ['category_id' => $category->category_id]);
    }

    public function test_non_admin_cannot_create_category(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
             ->postJson('/api/categories', ['name' => 'Hack'])
             ->assertStatus(403);
    }
}
