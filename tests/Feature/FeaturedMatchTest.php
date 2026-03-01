<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeaturedMatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_highest_elo_game(): void
    {
        $low1 = Player::factory()->withElo(800)->create();
        $low2 = Player::factory()->withElo(800)->create();
        Game::factory()->inProgress()->create([
            'player_one_id' => $low1->getKey(),
            'player_two_id' => $low2->getKey(),
            'allow_spectators' => true,
        ]);

        $high1 = Player::factory()->withElo(2000)->create();
        $high2 = Player::factory()->withElo(1900)->create();
        $topGame = Game::factory()->inProgress()->create([
            'player_one_id' => $high1->getKey(),
            'player_two_id' => $high2->getKey(),
            'allow_spectators' => true,
        ]);

        $response = $this->getJson('/games/featured');

        $response->assertOk();
        $response->assertJsonPath('featured.game_id', $topGame->getKey());
    }

    public function test_returns_null_when_no_games(): void
    {
        $response = $this->getJson('/games/featured');

        $response->assertOk();
        $response->assertJsonPath('featured', null);
    }

    public function test_excludes_completed_games(): void
    {
        Game::factory()->create([
            'status' => GameStatus::Completed,
            'allow_spectators' => true,
        ]);

        $response = $this->getJson('/games/featured');

        $response->assertOk();
        $response->assertJsonPath('featured', null);
    }

    public function test_excludes_non_spectatable_games(): void
    {
        Game::factory()->inProgress()->create([
            'allow_spectators' => false,
        ]);

        $response = $this->getJson('/games/featured');

        $response->assertOk();
        $response->assertJsonPath('featured', null);
    }

    public function test_spectator_count_boosts_ranking(): void
    {
        $high1 = Player::factory()->withElo(2000)->create();
        $high2 = Player::factory()->withElo(2000)->create();
        Game::factory()->inProgress()->create([
            'player_one_id' => $high1->getKey(),
            'player_two_id' => $high2->getKey(),
            'allow_spectators' => true,
            'spectator_count' => 0,
        ]);

        $low1 = Player::factory()->withElo(1000)->create();
        $low2 = Player::factory()->withElo(1000)->create();
        $popular = Game::factory()->inProgress()->create([
            'player_one_id' => $low1->getKey(),
            'player_two_id' => $low2->getKey(),
            'allow_spectators' => true,
            'spectator_count' => 50,
        ]);

        $response = $this->getJson('/games/featured');

        $response->assertOk();
        // 2000+2000+0 = 4000 vs 1000+1000+5000 = 7000
        $response->assertJsonPath('featured.game_id', $popular->getKey());
    }
}
