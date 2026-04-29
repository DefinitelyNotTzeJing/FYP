<?php

namespace Tests\Feature\Profile;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserProfileTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    // TC-UT-060: Update profile with valid fields
    public function test_user_can_update_phone_and_address(): void
    {
        $this->actingAs($this->user)
             ->putJson('/api/profile', [
                 'phone'   => '012-3456789',
                 'address' => '123 Jalan Merdeka, KL',
             ])
             ->assertStatus(200)
             ->assertJsonPath('success', true);

        $this->assertDatabaseHas('user_profiles', [
            'user_id' => $this->user->user_id,
            'phone'   => '012-3456789',
            'address' => '123 Jalan Merdeka, KL',
        ]);
    }
}
