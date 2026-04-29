<?php

namespace Tests\Feature\Cart;

use App\Models\Book;
use App\Models\Cart;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Book $book;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->book = Book::factory()->create(['available_quantity' => 10, 'price' => 20.00]);
    }

    // TC-UT-016: Add book to cart
    public function test_user_can_add_book_to_cart(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $this->book->book_id, 'quantity' => 2])
             ->assertStatus(201);

        $this->assertDatabaseHas('carts', [
            'user_id'  => $this->user->user_id,
            'book_id'  => $this->book->book_id,
            'quantity' => 2,
        ]);
    }

    // TC-UT-017: Add duplicate book to cart (quantity merge)
    public function test_adding_same_book_twice_merges_quantity(): void
    {
        Cart::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'quantity' => 2]);

        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $this->book->book_id, 'quantity' => 3]);

        $this->assertDatabaseHas('carts', [
            'user_id'  => $this->user->user_id,
            'book_id'  => $this->book->book_id,
            'quantity' => 5,
        ]);
    }

    // TC-UT-018: Remove book from cart
    public function test_user_can_remove_cart_item(): void
    {
        Cart::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'quantity' => 1]);

        $this->actingAs($this->user)
             ->deleteJson("/api/cart/{$this->book->book_id}")
             ->assertStatus(200);

        $this->assertDatabaseMissing('carts', [
            'user_id' => $this->user->user_id,
            'book_id' => $this->book->book_id,
        ]);
    }

    // TC-UT-019: Update cart quantity within stock limit
    public function test_user_can_update_cart_item_quantity(): void
    {
        Cart::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'quantity' => 1]);

        $this->actingAs($this->user)
             ->putJson("/api/cart/{$this->book->book_id}", ['quantity' => 4])
             ->assertStatus(200);

        $this->assertDatabaseHas('carts', [
            'user_id'  => $this->user->user_id,
            'book_id'  => $this->book->book_id,
            'quantity' => 4,
        ]);
    }

    // TC-UT-020: Update cart quantity exceeding available stock
    public function test_update_fails_when_quantity_exceeds_stock(): void
    {
        Cart::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'quantity' => 1]);

        $this->actingAs($this->user)
             ->putJson("/api/cart/{$this->book->book_id}", ['quantity' => 999])
             ->assertStatus(400);
    }
}
