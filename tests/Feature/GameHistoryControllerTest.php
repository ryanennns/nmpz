<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameHistoryControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_completed_games_for_player(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->completed()->create([
            'player_one_id' => $player->getKey(),
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/games");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.game_id', $game->getKey());
    }

    public function test_excludes_in_progress_games(): void
    {
        $player = Player::factory()->create();
        Game::factory()->inProgress()->create([
            'player_one_id' => $player->getKey(),
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/games");

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    }

    public function test_excludes_other_players_games(): void
    {
        $player = Player::factory()->create();
        $other = Player::factory()->create();
        Game::factory()->completed()->create([
            'player_one_id' => $other->getKey(),
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/games");

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    }

    public function test_returns_correct_result_field(): void
    {
        $player = Player::factory()->create();
        $opponent = Player::factory()->create();

        // Won game
        $won = Game::factory()->create([
            'player_one_id' => $player->getKey(),
            'player_two_id' => $opponent->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $player->getKey(),
        ]);

        // Lost game
        $lost = Game::factory()->create([
            'player_one_id' => $player->getKey(),
            'player_two_id' => $opponent->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $opponent->getKey(),
        ]);

        // Draw game
        $draw = Game::factory()->create([
            'player_one_id' => $player->getKey(),
            'player_two_id' => $opponent->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => null,
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/games");

        $response->assertOk();
        $data = $response->json('data');
        $results = collect($data)->pluck('result', 'game_id');

        $this->assertSame('win', $results[$won->getKey()]);
        $this->assertSame('loss', $results[$lost->getKey()]);
        $this->assertSame('draw', $results[$draw->getKey()]);
    }

    public function test_paginates_results(): void
    {
        $player = Player::factory()->create();
        for ($i = 0; $i < 25; $i++) {
            Game::factory()->create([
                'player_one_id' => $player->getKey(),
                'status' => GameStatus::Completed,
            ]);
        }

        $page1 = $this->getJson("/players/{$player->getKey()}/games");
        $page1->assertOk();
        $page1->assertJsonCount(20, 'data');
        $page1->assertJsonPath('last_page', 2);

        $page2 = $this->getJson("/players/{$player->getKey()}/games?page=2");
        $page2->assertOk();
        $page2->assertJsonCount(5, 'data');
    }

    public function test_show_returns_game_detail(): void
    {
        $game = Game::factory()->create([
            'status' => GameStatus::Completed,
        ]);
        Round::factory()->for($game)->create([
            'round_number' => 1,
            'location_lat' => 48.8566,
            'location_lng' => 2.3522,
            'player_one_score' => 4000,
            'player_two_score' => 3000,
        ]);

        $response = $this->getJson("/games/{$game->getKey()}/history");

        $response->assertOk();
        $response->assertJsonPath('game_id', $game->getKey());
        $response->assertJsonPath('winner_id', $game->winner_id);
        $response->assertJsonCount(1, 'rounds');
        $response->assertJsonPath('rounds.0.round_number', 1);
        $response->assertJsonPath('rounds.0.player_one_score', 4000);
        $response->assertJsonPath('rounds.0.player_two_score', 3000);
    }

    public function test_show_calculates_distances(): void
    {
        $game = Game::factory()->create(['status' => GameStatus::Completed]);
        Round::factory()->for($game)->create([
            'round_number' => 1,
            'location_lat' => 48.8566,
            'location_lng' => 2.3522,
            'player_one_guess_lat' => 48.8570,
            'player_one_guess_lng' => 2.3530,
            'player_two_guess_lat' => 51.5074,
            'player_two_guess_lng' => -0.1278,
        ]);

        $response = $this->getJson("/games/{$game->getKey()}/history");

        $response->assertOk();
        $data = $response->json('rounds.0');
        $this->assertNotNull($data['player_one_distance_km']);
        $this->assertNotNull($data['player_two_distance_km']);
        $this->assertIsFloat($data['player_one_distance_km']);
        $this->assertIsFloat($data['player_two_distance_km']);
    }

    public function test_show_returns_null_distance_for_no_guess(): void
    {
        $game = Game::factory()->create(['status' => GameStatus::Completed]);
        Round::factory()->for($game)->create([
            'round_number' => 1,
            'location_lat' => 48.8566,
            'location_lng' => 2.3522,
            'player_one_guess_lat' => null,
            'player_one_guess_lng' => null,
            'player_two_guess_lat' => null,
            'player_two_guess_lng' => null,
        ]);

        $response = $this->getJson("/games/{$game->getKey()}/history");

        $response->assertOk();
        $data = $response->json('rounds.0');
        $this->assertNull($data['player_one_distance_km']);
        $this->assertNull($data['player_two_distance_km']);
    }
}
