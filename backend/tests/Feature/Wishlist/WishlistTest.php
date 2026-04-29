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

    // TC-UT-064: Add book to wishlist
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

    // TC-UT-065: Add duplicate book to wishlist
    public function test_adding_duplicate_book_to_wishlist_is_rejected(): void
    {
        Wishlist::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id]);

        $this->actingAs($this->user)
             ->postJson('/api/wishlist', ['book_id' => $this->book->book_id])
             ->assertStatus(400);
    }

    // TC-UT-066: View wishlist
    public function test_user_can_view_wishlist(): void
    {
        Wishlist::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id]);

        $this->actingAs($this->user)
             ->getJson('/api/wishlist')
             ->assertStatus(200)
             ->assertJsonStructure(['data']);
    }

    // TC-UT-067: Remove book from wishlist
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
}
