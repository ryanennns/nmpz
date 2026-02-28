<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReplayTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_completed_game_replay(): void
    {
        $game = Game::factory()->create(['status' => GameStatus::Completed]);
        Round::factory()->for($game)->create([
            'round_number' => 1,
            'location_lat' => 48.8566,
            'location_lng' => 2.3522,
            'player_one_guess_lat' => 48.86,
            'player_one_guess_lng' => 2.35,
            'player_two_guess_lat' => 51.50,
            'player_two_guess_lng' => -0.12,
            'player_one_score' => 4900,
            'player_two_score' => 2000,
        ]);

        $response = $this->getJson("/games/{$game->getKey()}/replay");

        $response->assertOk();
        $response->assertJsonPath('game_id', $game->getKey());
        $response->assertJsonCount(1, 'rounds');
        $response->assertJsonPath('rounds.0.round_number', 1);
        $response->assertJsonPath('rounds.0.player_one_score', 4900);
        $this->assertNotNull($response->json('rounds.0.player_one_distance_km'));
        $this->assertNotNull($response->json('rounds.0.location_heading'));
    }

    public function test_returns_404_for_in_progress_game(): void
    {
        $game = Game::factory()->inProgress()->create();

        $response = $this->getJson("/games/{$game->getKey()}/replay");

        $response->assertNotFound();
    }

    public function test_returns_multiple_rounds_in_order(): void
    {
        $game = Game::factory()->create(['status' => GameStatus::Completed]);
        Round::factory()->for($game)->create(['round_number' => 2]);
        Round::factory()->for($game)->create(['round_number' => 1]);
        Round::factory()->for($game)->create(['round_number' => 3]);

        $response = $this->getJson("/games/{$game->getKey()}/replay");

        $response->assertOk();
        $rounds = $response->json('rounds');
        $this->assertSame(1, $rounds[0]['round_number']);
        $this->assertSame(2, $rounds[1]['round_number']);
        $this->assertSame(3, $rounds[2]['round_number']);
    }

    public function test_returns_null_distance_for_no_guess(): void
    {
        $game = Game::factory()->create(['status' => GameStatus::Completed]);
        Round::factory()->for($game)->create([
            'round_number' => 1,
            'player_one_guess_lat' => null,
            'player_one_guess_lng' => null,
        ]);

        $response = $this->getJson("/games/{$game->getKey()}/replay");

        $response->assertOk();
        $this->assertNull($response->json('rounds.0.player_one_distance_km'));
    }

    public function test_returns_total_scores(): void
    {
        $game = Game::factory()->create(['status' => GameStatus::Completed]);
        Round::factory()->for($game)->create([
            'round_number' => 1,
            'player_one_score' => 3000,
            'player_two_score' => 4000,
        ]);
        Round::factory()->for($game)->create([
            'round_number' => 2,
            'player_one_score' => 2000,
            'player_two_score' => 1000,
        ]);

        $response = $this->getJson("/games/{$game->getKey()}/replay");

        $response->assertOk();
        $response->assertJsonPath('player_one_total_score', 5000);
        $response->assertJsonPath('player_two_total_score', 5000);
    }

    public function test_returns_player_info(): void
    {
        $game = Game::factory()->create(['status' => GameStatus::Completed]);

        $response = $this->getJson("/games/{$game->getKey()}/replay");

        $response->assertOk();
        $response->assertJsonStructure([
            'player_one' => ['id', 'name', 'elo_rating'],
            'player_two' => ['id', 'name', 'elo_rating'],
        ]);
        $response->assertJsonPath('match_format', $game->match_format ?? 'classic');
    }
}
