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
    private Book $oosBook;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user    = User::factory()->create();
        $this->oosBook = Book::factory()->outOfStock()->create();
    }

    public function test_user_can_preorder_out_of_stock_book(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/preorders', ['book_id' => $this->oosBook->book_id, 'quantity' => 1])
             ->assertStatus(201);

        $this->assertDatabaseHas('preorders', [
            'user_id' => $this->user->user_id,
            'book_id' => $this->oosBook->book_id,
            'status'  => 'pending',
        ]);
    }

    public function test_user_cannot_preorder_in_stock_book(): void
    {
        $inStock = Book::factory()->create(['available_quantity' => 5]);

        // Controller returns 400 (not 422) when book is in stock
        $this->actingAs($this->user)
             ->postJson('/api/preorders', ['book_id' => $inStock->book_id, 'quantity' => 1])
             ->assertStatus(400);
    }

    public function test_user_cannot_preorder_same_book_twice(): void
    {
        Preorder::create([
            'user_id'           => $this->user->user_id,
            'book_id'           => $this->oosBook->book_id,
            'quantity'          => 1,
            'price_at_preorder' => $this->oosBook->price,
            'status'            => 'pending',
        ]);

        // Controller returns 409 (Conflict) for duplicate pending pre-order
        $this->actingAs($this->user)
             ->postJson('/api/preorders', ['book_id' => $this->oosBook->book_id, 'quantity' => 1])
             ->assertStatus(409);
    }

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

    public function test_user_can_list_own_preorders(): void
    {
        Preorder::create([
            'user_id'           => $this->user->user_id,
            'book_id'           => $this->oosBook->book_id,
            'quantity'          => 1,
            'price_at_preorder' => 20.00,
            'status'            => 'pending',
        ]);

        // Controller returns { success, data: [...] }
        $this->actingAs($this->user)
             ->getJson('/api/preorders')
             ->assertStatus(200)
             ->assertJsonStructure(['data']);
    }

    public function test_admin_can_update_preorder_status(): void
    {
        $admin    = User::factory()->create(['is_admin' => true]);
        $preorder = Preorder::create([
            'user_id'           => $this->user->user_id,
            'book_id'           => $this->oosBook->book_id,
            'quantity'          => 1,
            'price_at_preorder' => 20.00,
            'status'            => 'pending',
        ]);

        $this->actingAs($admin)
             ->putJson("/api/admin/preorders/{$preorder->preorder_id}/status", ['status' => 'fulfilled'])
             ->assertStatus(200);

        $this->assertEquals('fulfilled', $preorder->fresh()->status);
    }
}
