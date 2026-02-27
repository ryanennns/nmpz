<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class PlayerJoinsQueueTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_cannot_join_queue_with_active_game(): void
    {
        $player = Player::factory()->create();
        Game::factory()->inProgress()->create([
            'player_one_id' => $player->getKey(),
        ]);

        Cache::put('matchmaking_queue', []);

        $this->postJson(route('players.join-queue', $player))
            ->assertStatus(409)
            ->assertJson(['error' => 'Player already in game']);

        $this->assertSame([], Cache::get('matchmaking_queue'));
    }
}
