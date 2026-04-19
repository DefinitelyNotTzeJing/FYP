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

    // ── Index ─────────────────────────────────────────────────────────────────

    public function test_user_can_get_own_cart(): void
    {
        Cart::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'quantity' => 2]);

        $response = $this->actingAs($this->user)->getJson('/api/cart');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data', 'summary']);
    }

    public function test_cart_summary_includes_correct_totals(): void
    {
        Cart::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'quantity' => 3]);

        $response = $this->actingAs($this->user)->getJson('/api/cart');

        $summary = $response->json('summary');
        $this->assertEquals(3, $summary['total_quantity']);
        $this->assertEquals(60.00, (float) $summary['subtotal']);
    }

    // ── Store ────────────────────────────────────────────────────────────────

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

    public function test_cannot_add_more_than_available_stock(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $this->book->book_id, 'quantity' => 99])
             ->assertStatus(400);
    }

    public function test_cannot_add_out_of_stock_book(): void
    {
        $oos = Book::factory()->outOfStock()->create();

        $this->actingAs($this->user)
             ->postJson('/api/cart', ['book_id' => $oos->book_id, 'quantity' => 1])
             ->assertStatus(400);
    }

    // ── Update ────────────────────────────────────────────────────────────────

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

    public function test_update_fails_when_quantity_exceeds_stock(): void
    {
        Cart::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'quantity' => 1]);

        $this->actingAs($this->user)
             ->putJson("/api/cart/{$this->book->book_id}", ['quantity' => 999])
             ->assertStatus(400);
    }

    // ── Destroy ───────────────────────────────────────────────────────────────

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

    public function test_user_can_clear_entire_cart(): void
    {
        $book2 = Book::factory()->create();
        Cart::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'quantity' => 1]);
        Cart::create(['user_id' => $this->user->user_id, 'book_id' => $book2->book_id, 'quantity' => 1]);

        $this->actingAs($this->user)->deleteJson('/api/cart')->assertStatus(200);

        $this->assertDatabaseMissing('carts', ['user_id' => $this->user->user_id]);
    }

    // ── Auth guard ────────────────────────────────────────────────────────────

    public function test_unauthenticated_user_cannot_access_cart(): void
    {
        $this->getJson('/api/cart')->assertStatus(401);
    }
}
