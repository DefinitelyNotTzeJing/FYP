<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin       = User::factory()->create(['is_admin' => true]);
        $this->regularUser = User::factory()->create();
    }

    // TC-UT-059: Admin views paginated user list
    public function test_admin_can_list_all_users(): void
    {
        $this->actingAs($this->admin)
             ->getJson('/api/admin/users')
             ->assertStatus(200)
             ->assertJsonStructure(['success', 'data', 'total', 'current_page', 'last_page']);
    }

    // TC-UT-072: Admin searches users by username
    public function test_admin_can_search_users_by_username(): void
    {
        $unique = User::factory()->create(['username' => 'uniquehandle123']);

        $response = $this->actingAs($this->admin)
                         ->getJson('/api/admin/users?search=uniquehandle123');

        $this->assertEquals(1, $response->json('total'));
        $this->assertEquals('uniquehandle123', $response->json('data.0.username'));
    }

    // TC-UT-073: Admin views user detail
    public function test_admin_can_view_single_user(): void
    {
        $this->actingAs($this->admin)
             ->getJson("/api/admin/users/{$this->regularUser->user_id}")
             ->assertStatus(200)
             ->assertJsonStructure([
                 'data' => ['user_id', 'username', 'email', 'is_admin', 'orders_count'],
             ]);
    }
}
