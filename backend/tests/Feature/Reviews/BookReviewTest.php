<?php

namespace Tests\Feature\Reviews;

use App\Models\Book;
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

    // TC-UT-026: Submit rating and review by authenticated user
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

    // TC-UT-026: Submit rating with comment (review)
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

    // TC-UT-027: Submit duplicate rating for the same book
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
}
