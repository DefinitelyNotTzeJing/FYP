<?php

namespace Tests\Feature\Wishlist;

use App\Models\Book;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WishlistTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Book $book;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->book = Book::factory()->create();
    }

    public function test_user_can_view_wishlist(): void
    {
        Wishlist::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id]);

        $this->actingAs($this->user)
             ->getJson('/api/wishlist')
             ->assertStatus(200)
             ->assertJsonStructure(['data']);
    }

    public function test_user_can_add_book_to_wishlist(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/wishlist', ['book_id' => $this->book->book_id])
             ->assertStatus(201);

        $this->assertDatabaseHas('wishlists', [
            'user_id' => $this->user->user_id,
            'book_id' => $this->book->book_id,
        ]);
    }

    public function test_adding_duplicate_book_to_wishlist_is_rejected(): void
    {
        Wishlist::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id]);

        $this->actingAs($this->user)
             ->postJson('/api/wishlist', ['book_id' => $this->book->book_id])
             ->assertStatus(400);
    }

    public function test_user_can_remove_book_from_wishlist(): void
    {
        Wishlist::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id]);

        $this->actingAs($this->user)
             ->deleteJson("/api/wishlist/{$this->book->book_id}")
             ->assertStatus(200);

        $this->assertDatabaseMissing('wishlists', [
            'user_id' => $this->user->user_id,
            'book_id' => $this->book->book_id,
        ]);
    }

    public function test_check_returns_true_when_book_in_wishlist(): void
    {
        Wishlist::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id]);

        $this->actingAs($this->user)
             ->getJson("/api/wishlist/check/{$this->book->book_id}")
             ->assertStatus(200)
             ->assertJson(['in_wishlist' => true]);
    }

    public function test_check_returns_false_when_book_not_in_wishlist(): void
    {
        $this->actingAs($this->user)
             ->getJson("/api/wishlist/check/{$this->book->book_id}")
             ->assertStatus(200)
             ->assertJson(['in_wishlist' => false]);
    }

    public function test_user_can_clear_entire_wishlist(): void
    {
        Wishlist::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id]);
        Wishlist::create(['user_id' => $this->user->user_id, 'book_id' => Book::factory()->create()->book_id]);

        $this->actingAs($this->user)->deleteJson('/api/wishlist')->assertStatus(200);

        $this->assertDatabaseMissing('wishlists', ['user_id' => $this->user->user_id]);
    }

    public function test_users_wishlists_are_isolated(): void
    {
        $other = User::factory()->create();
        Wishlist::create(['user_id' => $other->user_id, 'book_id' => $this->book->book_id]);

        $response = $this->actingAs($this->user)->getJson('/api/wishlist');

        $this->assertEmpty($response->json('data'));
    }
}
