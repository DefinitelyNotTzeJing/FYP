<?php

namespace Tests\Unit\Models;

use App\Models\Author;
use App\Models\Book;
use App\Models\Category;
use App\Models\Rating;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookModelTest extends TestCase
{
    use RefreshDatabase;

    private Book $book;

    protected function setUp(): void
    {
        parent::setUp();
        $this->book = Book::factory()->create([
            'available_quantity'    => 10,
            'book_total_rating'     => 0,
            'book_number_of_rating' => 0,
        ]);
    }

    public function test_is_in_stock_returns_true_when_quantity_above_zero(): void
    {
        $this->assertTrue($this->book->isInStock());
    }

    public function test_is_in_stock_returns_false_when_quantity_is_zero(): void
    {
        $this->book->update(['available_quantity' => 0]);
        $this->assertFalse($this->book->isInStock());
    }

    public function test_scope_in_stock_filters_out_zero_quantity_books(): void
    {
        Book::factory()->outOfStock()->create();

        $inStock = Book::inStock()->get();

        $this->assertTrue($inStock->every(fn($b) => $b->available_quantity > 0));
    }

    public function test_update_rating_recalculates_average_correctly(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        Rating::create(['user_id' => $user1->user_id, 'book_id' => $this->book->book_id, 'score' => 4]);
        Rating::create(['user_id' => $user2->user_id, 'book_id' => $this->book->book_id, 'score' => 2]);

        $this->book->updateRating();
        $this->book->refresh();

        $this->assertEquals(3.00, (float) $this->book->book_total_rating);
        $this->assertEquals(2, $this->book->book_number_of_rating);
    }

    public function test_update_rating_sets_zero_when_no_ratings_exist(): void
    {
        $this->book->updateRating();
        $this->book->refresh();

        $this->assertEquals(0, (float) $this->book->book_total_rating);
        $this->assertEquals(0, $this->book->book_number_of_rating);
    }

    public function test_book_belongs_to_author(): void
    {
        $this->assertInstanceOf(Author::class, $this->book->author);
    }

    public function test_book_belongs_to_category(): void
    {
        $this->assertInstanceOf(Category::class, $this->book->category);
    }

    public function test_price_is_cast_to_decimal(): void
    {
        $book = Book::factory()->create(['price' => '29.99']);
        $this->assertEquals('29.99', $book->price);
    }
}
