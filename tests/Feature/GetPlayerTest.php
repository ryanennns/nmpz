<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GetPlayerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_rejects_if_unauthed_user_requests_claimed_player(): void
    {
        $player = Player::factory()->create([
            'user_id' => User::factory()->create()->getKey(),
        ]);

        $this->getJson(route('players.get', $player))
            ->assertUnauthorized();
    }

    public function test_it_allows_unauthed_user_to_request_unclaimed_player(): void
    {
        $player = Player::factory()->create();

        $this->getJson(route('players.get', $player))
            ->assertOk()
            ->assertJsonPath('id', $player->getKey())
            ->assertJsonPath('is_guest', true);
    }

    public function test_it_rejects_if_a_different_user_requests_claimed_player(): void
    {
        $player = Player::factory()->create([
            'user_id' => User::factory()->create()->getKey(),
        ]);

        $this->actingAs(User::factory()->create())
            ->getJson(route('players.get', $player))
            ->assertUnauthorized();
    }

    public function test_it_allows_the_claimed_user_to_request_their_player(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create([
            'user_id' => $user->getKey(),
        ]);

        $this->actingAs($user)
            ->getJson(route('players.get', $player))
            ->assertOk()
            ->assertJsonPath('id', $player->getKey())
            ->assertJsonPath('is_guest', false);
    }
}
