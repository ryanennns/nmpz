<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GetAuthPlayerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_auth_player(): void
    {
        $this->getJson('/auth/player')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_without_player_gets_404(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/auth/player')
            ->assertNotFound()
            ->assertExactJson([]);
    }

    public function test_authenticated_user_gets_player_and_user_payload(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create([
            'name' => 'Alice',
            'user_id' => $user->getKey()
        ]);

        $this->actingAs($user)
            ->getJson('/auth/player')
            ->assertOk()
            ->assertJsonPath('player.id', $player->getKey())
            ->assertJsonPath('player.name', 'Alice')
            ->assertJsonPath('player.user_id', $user->getKey())
            ->assertJsonPath('user.id', $user->getKey())
            ->assertJsonPath('user.name', $user->name)
            ->assertJsonPath('user.email', $user->email);
    }
}
