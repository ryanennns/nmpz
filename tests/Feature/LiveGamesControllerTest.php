<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveGamesControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_in_progress_games(): void
    {
        $game = Game::factory()->inProgress()->create([
            'allow_spectators' => true,
        ]);

        $response = $this->getJson('/games/live');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.game_id', $game->getKey());
    }

    public function test_excludes_completed_games(): void
    {
        Game::factory()->create([
            'status' => GameStatus::Completed,
            'allow_spectators' => true,
        ]);

        $response = $this->getJson('/games/live');

        $response->assertOk();
        $response->assertJsonCount(0);
    }

    public function test_excludes_games_with_spectating_disabled(): void
    {
        Game::factory()->inProgress()->create([
            'allow_spectators' => false,
        ]);

        $response = $this->getJson('/games/live');

        $response->assertOk();
        $response->assertJsonCount(0);
    }

    public function test_returns_correct_fields(): void
    {
        $game = Game::factory()->inProgress()->create([
            'allow_spectators' => true,
            'spectator_count' => 5,
            'match_format' => 'bo3',
        ]);
        $game->load(['playerOne.user', 'playerTwo.user']);

        $response = $this->getJson('/games/live');

        $response->assertOk();
        $response->assertJsonPath('0.game_id', $game->getKey());
        $response->assertJsonPath('0.player_one_name', $game->playerOne->user->name);
        $response->assertJsonPath('0.player_two_name', $game->playerTwo->user->name);
        $response->assertJsonPath('0.spectator_count', 5);
        $response->assertJsonPath('0.match_format', 'bo3');
        $this->assertArrayHasKey('player_one_elo', $response->json('0'));
        $this->assertArrayHasKey('player_two_elo', $response->json('0'));
    }

    public function test_returns_empty_when_no_live_games(): void
    {
        $response = $this->getJson('/games/live');

        $response->assertOk();
        $response->assertJson([]);
        $response->assertJsonCount(0);
    }
}
