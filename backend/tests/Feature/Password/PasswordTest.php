<?php

namespace Tests\Feature\Password;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['password' => 'original123']);
    }

    // TC-UT-061: Change password with correct current password
    public function test_authenticated_user_can_change_password(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/password/change', [
                 'current_password'      => 'original123',
                 'password'              => 'newpassword1',
                 'password_confirmation' => 'newpassword1',
             ])
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        $this->assertTrue(Hash::check('newpassword1', $this->user->fresh()->password));

        // Sanctum tokens should be revoked
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $this->user->user_id,
        ]);
    }

    // TC-UT-062: Change password with incorrect current password
    public function test_change_password_fails_with_wrong_current_password(): void
    {
        $this->actingAs($this->user)
             ->postJson('/api/password/change', [
                 'current_password'      => 'wrongcurrent',
                 'password'              => 'newpassword1',
                 'password_confirmation' => 'newpassword1',
             ])
             ->assertStatus(401);
    }
}
