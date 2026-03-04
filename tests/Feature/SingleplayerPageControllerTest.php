<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\SoloGame;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SingleplayerPageControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_load_a_guest_owned_singleplayer_page(): void
    {
        $player = Player::factory()->create();
        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
        ]);

        $this->get("/singleplayer/{$game->getKey()}?player_id={$player->getKey()}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('singleplayer')
                ->where('authenticated', false)
                ->where('soloGameId', $game->getKey())
                ->where('playerId', null),
            );
    }

    public function test_authenticated_users_can_load_their_owned_singleplayer_page(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create([
            'user_id' => $user->getKey(),
        ]);
        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
        ]);

        $this->actingAs($user)
            ->get("/singleplayer/{$game->getKey()}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('singleplayer')
                ->where('authenticated', true)
                ->where('soloGameId', $game->getKey())
                ->where('playerId', $player->getKey()),
            );
    }

    public function test_user_owned_singleplayer_pages_require_the_matching_authenticated_user(): void
    {
        $player = Player::factory()->create([
            'user_id' => User::factory()->create()->getKey(),
        ]);
        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
        ]);

        $this->get("/singleplayer/{$game->getKey()}")
            ->assertUnauthorized();
    }
}
