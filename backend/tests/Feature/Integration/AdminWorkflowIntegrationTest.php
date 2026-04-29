<?php

namespace Tests\Feature\Integration;

use App\Models\Author;
use App\Models\Book;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Order;
use App\Models\Preorder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Integration tests TC-IT-015 to TC-IT-019
 * Admin Workflow Integration
 */
class AdminWorkflowIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['is_admin' => true]);
        $this->user  = User::factory()->create(['password' => 'secret123']);
    }

    // TC-IT-015: Admin creates book, user browses and rates it
    public function test_TC_IT_015_admin_creates_book_user_browses_and_rates_it(): void
    {
        $author   = Author::factory()->create();
        $category = Category::factory()->create();

        // Step 1: Admin creates book
        $createResponse = $this->actingAs($this->admin)
             ->postJson('/api/books', [
                 'book_name'          => 'Integration Test Book',
                 'author_id'          => $author->author_id,
                 'category_id'        => $category->category_id,
                 'price'              => 25.00,
                 'available_quantity' => 10,
             ]);
        $createResponse->assertStatus(201);
        $bookId = $createResponse->json('data.book_id')
            ?? $createResponse->json('book.book_id')
            ?? Book::where('book_name', 'Integration Test Book')->value('book_id');

        // Step 2: User can browse and find the book
        $listResponse = $this->getJson('/api/books');
        $listResponse->assertStatus(200);
        $bookIds = collect($listResponse->json('data'))->pluck('book_id')->toArray();
        $this->assertContains($bookId, $bookIds);

        // Step 3: User submits a rating
        $this->actingAs($this->user)
             ->postJson('/api/book-reviews', ['book_id' => $bookId, 'score' => 5])
             ->assertStatus(201);

        // Step 4: Book average rating should be updated
        $detailResponse = $this->getJson("/api/books/{$bookId}");
        $detailResponse->assertStatus(200);

        $rating = Book::find($bookId)->book_total_rating;
        $this->assertEquals(5.00, (float) $rating);
    }

    // TC-IT-016: Admin updates order status through full lifecycle
    public function test_TC_IT_016_admin_updates_order_status_through_full_lifecycle(): void
    {
        $order = Order::create([
            'user_id'          => $this->user->user_id,
            'order_number'     => Order::generateOrderNumber(),
            'total_amount'     => 50.00,
            'shipping_address' => '123 Test St',
            'status'           => 'pending',
        ]);

        $statuses = ['processing', 'shipped', 'delivered'];

        foreach ($statuses as $status) {
            $this->actingAs($this->admin)
                 ->putJson("/api/admin/orders/{$order->order_id}/status", ['status' => $status])
                 ->assertStatus(200);

            $this->assertEquals($status, $order->fresh()->status);
        }
    }

    // TC-IT-017: Admin fulfils preorder after restocking
    public function test_TC_IT_017_admin_fulfils_preorder_after_restocking(): void
    {
        $book = Book::factory()->outOfStock()->create();

        // Step 1: User creates preorder for out-of-stock book
        $this->actingAs($this->user)
             ->postJson('/api/preorders', ['book_id' => $book->book_id, 'quantity' => 1])
             ->assertStatus(201);

        $preorder = Preorder::where([
            'user_id' => $this->user->user_id,
            'book_id' => $book->book_id,
        ])->first();

        $this->assertEquals('pending', $preorder->status);

        // Step 2: Admin restocks the book
        $this->actingAs($this->admin)
             ->putJson("/api/books/{$book->book_id}", ['available_quantity' => 10])
             ->assertStatus(200);

        // Step 3: Admin fulfils preorder
        $this->actingAs($this->admin)
             ->putJson("/api/admin/preorders/{$preorder->preorder_id}/status", ['status' => 'fulfilled'])
             ->assertStatus(200);

        $this->assertEquals('fulfilled', $preorder->fresh()->status);
    }

    // TC-IT-018: Non-admin token rejected across all admin endpoints
    public function test_TC_IT_018_non_admin_token_rejected_across_all_admin_endpoints(): void
    {
        $author   = Author::factory()->create();
        $category = Category::factory()->create();

        $endpoints = [
            ['method' => 'postJson', 'uri' => '/api/books', 'body' => [
                'book_name' => 'Hack', 'author_id' => $author->author_id,
                'category_id' => $category->category_id, 'price' => 1, 'available_quantity' => 1,
            ]],
            ['method' => 'postJson', 'uri' => '/api/authors',    'body' => ['name' => 'Hack Author']],
            ['method' => 'postJson', 'uri' => '/api/categories', 'body' => ['name' => 'Hack Cat']],
            ['method' => 'getJson',  'uri' => '/api/admin/users', 'body' => []],
        ];

        foreach ($endpoints as $ep) {
            $method   = $ep['method'];
            $response = $this->actingAs($this->user)->$method($ep['uri'], $ep['body']);
            $response->assertStatus(403);
        }
    }

    // TC-IT-019: Unauthenticated request rejected on protected endpoints
    public function test_TC_IT_019_unauthenticated_request_rejected_on_protected_endpoints(): void
    {
        $this->getJson('/api/cart')->assertStatus(401);
        $this->getJson('/api/orders')->assertStatus(401);
        $this->getJson('/api/profile')->assertStatus(401);
    }
}
