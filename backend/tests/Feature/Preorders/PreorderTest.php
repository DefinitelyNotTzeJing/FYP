<?php

namespace Tests\Feature\Preorders;

use App\Models\Book;
use App\Models\Preorder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PreorderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private User $admin;
    private Book $oosBook;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user    = User::factory()->create();
        $this->admin   = User::factory()->create(['is_admin' => true]);
        $this->oosBook = Book::factory()->outOfStock()->create();
    }

    // TC-UT-054: Admin views all preorders
    public function test_admin_can_view_all_preorders(): void
    {
        Preorder::create([
            'user_id'           => $this->user->user_id,
            'book_id'           => $this->oosBook->book_id,
            'quantity'          => 1,
            'price_at_preorder' => $this->oosBook->price,
            'status'            => 'pending',
        ]);

        $this->actingAs($this->admin)
             ->getJson('/api/admin/preorders')
             ->assertStatus(200);
    }

    // TC-UT-055: Admin filters preorders by status
    public function test_admin_can_filter_preorders_by_status(): void
    {
        Preorder::create([
            'user_id'           => $this->user->user_id,
            'book_id'           => $this->oosBook->book_id,
            'quantity'          => 1,
            'price_at_preorder' => $this->oosBook->price,
            'status'            => 'pending',
        ]);

        $response = $this->actingAs($this->admin)
             ->getJson('/api/admin/preorders?status=pending')
             ->assertStatus(200);

        // Admin preorders are paginated: { success, data: { data: [...preorders...], ... } }
        $items = $response->json('data.data') ?? [];
        $this->assertNotEmpty($items);
        foreach ($items as $item) {
            $this->assertEquals('pending', $item['status']);
        }
    }

    // TC-UT-056: Admin fulfils pending preorder
    public function test_admin_can_update_preorder_status_to_fulfilled(): void
    {
        $preorder = Preorder::create([
            'user_id'           => $this->user->user_id,
            'book_id'           => $this->oosBook->book_id,
            'quantity'          => 1,
            'price_at_preorder' => 20.00,
            'status'            => 'pending',
        ]);

        $this->actingAs($this->admin)
             ->putJson("/api/admin/preorders/{$preorder->preorder_id}/status", ['status' => 'fulfilled'])
             ->assertStatus(200);

        $this->assertEquals('fulfilled', $preorder->fresh()->status);
    }

    // TC-UT-057: User cancels own pending preorder
    public function test_user_can_cancel_own_preorder(): void
    {
        $preorder = Preorder::create([
            'user_id'           => $this->user->user_id,
            'book_id'           => $this->oosBook->book_id,
            'quantity'          => 1,
            'price_at_preorder' => $this->oosBook->price,
            'status'            => 'pending',
        ]);

        $this->actingAs($this->user)
             ->deleteJson("/api/preorders/{$preorder->preorder_id}")
             ->assertStatus(200);

        $this->assertEquals('cancelled', $preorder->fresh()->status);
    }

    // TC-UT-058: User attempts to preorder in-stock book
    public function test_user_cannot_preorder_in_stock_book(): void
    {
        $inStock = Book::factory()->create(['available_quantity' => 5]);

        $this->actingAs($this->user)
             ->postJson('/api/preorders', ['book_id' => $inStock->book_id, 'quantity' => 1])
             ->assertStatus(400);
    }
}
