<?php

namespace Tests\Feature\Reviews;

use App\Models\Book;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Rating;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookReviewTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Book $book;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->book = Book::factory()->create(['book_total_rating' => 0, 'book_number_of_rating' => 0]);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_submit_rating(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/book-reviews', [
                 'book_id' => $this->book->book_id,
                 'score'   => 4,
             ])
             ->assertStatus(201);

        $this->assertDatabaseHas('ratings', [
            'user_id' => $this->user->user_id,
            'book_id' => $this->book->book_id,
            'score'   => 4,
        ]);
    }

    public function test_user_can_submit_rating_with_review(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/book-reviews', [
                 'book_id' => $this->book->book_id,
                 'score'   => 5,
                 'comment' => 'Excellent read!',
             ])
             ->assertStatus(201);

        $this->assertDatabaseHas('reviews', [
            'user_id' => $this->user->user_id,
            'book_id' => $this->book->book_id,
            'comment' => 'Excellent read!',
        ]);
    }

    public function test_user_cannot_submit_duplicate_rating(): void
    {
        Rating::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'score' => 3]);

        $this->actingAs($this->user)
             ->postJson('/api/book-reviews', [
                 'book_id' => $this->book->book_id,
                 'score'   => 5,
             ])
             ->assertStatus(400);
    }

    public function test_score_must_be_between_1_and_5(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/book-reviews', [
                 'book_id' => $this->book->book_id,
                 'score'   => 6,
             ])
             ->assertStatus(422);

        $this->actingAs($this->user)
             ->postJson('/api/book-reviews', [
                 'book_id' => $this->book->book_id,
                 'score'   => 0,
             ])
             ->assertStatus(422);
    }

    // ── Book rating auto-update ───────────────────────────────────────────────

    public function test_book_average_rating_updates_after_new_rating(): void
    {
        $user2 = User::factory()->create();

        Rating::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'score' => 4]);
        Rating::create(['user_id' => $user2->user_id,      'book_id' => $this->book->book_id, 'score' => 2]);

        $this->book->refresh();
        $this->assertEquals(3.00, (float) $this->book->book_total_rating);
        $this->assertEquals(2, $this->book->book_number_of_rating);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public function test_anyone_can_list_reviews_for_book(): void
    {
        Rating::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'score' => 5]);

        $this->getJson("/api/books/{$this->book->book_id}/reviews")
             ->assertStatus(200)
             ->assertJsonStructure(['reviews', 'pagination']);
    }

    public function test_authenticated_user_can_get_own_review(): void
    {
        Rating::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'score' => 4]);

        $this->actingAs($this->user)
             ->getJson("/api/books/{$this->book->book_id}/my-review")
             ->assertStatus(200)
             ->assertJsonFragment(['score' => 4]);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public function test_user_can_update_own_rating(): void
    {
        Rating::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'score' => 3]);

        $this->actingAs($this->user)
             ->putJson("/api/book-reviews/{$this->book->book_id}", ['score' => 5])
             ->assertStatus(200);

        $this->assertDatabaseHas('ratings', [
            'user_id' => $this->user->user_id,
            'book_id' => $this->book->book_id,
            'score'   => 5,
        ]);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public function test_user_can_delete_own_rating(): void
    {
        Rating::create(['user_id' => $this->user->user_id, 'book_id' => $this->book->book_id, 'score' => 4]);

        $this->actingAs($this->user)
             ->deleteJson("/api/book-reviews/{$this->book->book_id}")
             ->assertStatus(200);

        $this->assertDatabaseMissing('ratings', [
            'user_id' => $this->user->user_id,
            'book_id' => $this->book->book_id,
        ]);
    }
}
