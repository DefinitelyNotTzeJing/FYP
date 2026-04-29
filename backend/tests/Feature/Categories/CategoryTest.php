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

    // TC-UT-046: Fetch category list for filter panel
    public function test_anyone_can_list_categories(): void
    {
        Category::factory()->count(3)->create();

        $this->getJson('/api/categories')
             ->assertStatus(200)
             ->assertJsonCount(3);
    }

    // TC-UT-046b: View single category with its books
    public function test_anyone_can_view_category_with_books(): void
    {
        $category = Category::factory()->create();

        $this->getJson("/api/categories/{$category->category_id}")
             ->assertStatus(200)
             ->assertJsonFragment(['category_id' => $category->category_id]);
    }

    // TC-UT-044: Admin adds category with valid name (slug auto-generated)
    public function test_admin_can_create_category_with_slug_auto_generated(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
             ->postJson('/api/categories', ['name' => 'Mystery Thrillers'])
             ->assertStatus(201);

        $this->assertDatabaseHas('categories', ['slug' => 'mystery-thrillers']);
    }

    // TC-UT-045: Admin adds category with duplicate name
    public function test_admin_cannot_create_category_with_duplicate_name(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        Category::factory()->create(['name' => 'Existing Category']);

        $this->actingAs($admin)
             ->postJson('/api/categories', ['name' => 'Existing Category'])
             ->assertStatus(422);
    }

    // TC-UT-047: Admin updates category name
    public function test_admin_can_update_category(): void
    {
        $admin    = User::factory()->create(['is_admin' => true]);
        $category = Category::factory()->create();

        $this->actingAs($admin)
             ->putJson("/api/categories/{$category->category_id}", ['name' => 'Updated Name'])
             ->assertStatus(200);

        $this->assertDatabaseHas('categories', ['category_id' => $category->category_id, 'name' => 'Updated Name']);
    }

    // TC-UT-048: Admin deletes empty category
    public function test_admin_can_delete_empty_category(): void
    {
        $admin    = User::factory()->create(['is_admin' => true]);
        $category = Category::factory()->create();

        $this->actingAs($admin)
             ->deleteJson("/api/categories/{$category->category_id}")
             ->assertStatus(200);

        $this->assertDatabaseMissing('categories', ['category_id' => $category->category_id]);
    }

    // TC-UT-049: Admin deletes category with assigned books
    public function test_admin_cannot_delete_category_with_books(): void
    {
        $admin    = User::factory()->create(['is_admin' => true]);
        $category = Category::factory()->create();
        Book::factory()->create(['category_id' => $category->category_id]);

        $this->actingAs($admin)
             ->deleteJson("/api/categories/{$category->category_id}")
             ->assertStatus(400);
    }
}
