<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Location;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GameSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_completed_game_summary_renders_correct_data(): void
    {
        $playerOne = Player::factory()->create(['name' => 'Alice']);
        $playerTwo = Player::factory()->create(['name' => 'Bob']);

        $game = Game::factory()->create([
            'status' => GameStatus::Completed,
            'player_one_id' => $playerOne->getKey(),
            'player_two_id' => $playerTwo->getKey(),
            'winner_id' => $playerOne->getKey(),
        ]);

        $location = Location::factory()->create([
            'map_id' => $game->map_id,
            'lat' => 48.8566,
            'lng' => 2.3522,
        ]);

        Round::factory()->create([
            'game_id' => $game->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 1,
            'player_one_guess_lat' => 48.9,
            'player_one_guess_lng' => 2.4,
            'player_two_guess_lat' => null,
            'player_two_guess_lng' => null,
            'player_one_score' => 4500,
            'player_two_score' => null,
        ]);

        $this->get("/games/{$game->getKey()}/summary")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('game-summary')
                ->where('game.id', $game->getKey())
                ->where('game.player_one.id', $playerOne->getKey())
                ->where('game.player_one.name', 'Alice')
                ->where('game.player_two.id', $playerTwo->getKey())
                ->where('game.player_two.name', 'Bob')
                ->where('game.winner_id', $playerOne->getKey())
                ->where('game.player_one_total_score', 4500)
                ->where('game.player_two_total_score', 0)
                ->where('game.rounds.0.round_number', 1)
                ->where('game.rounds.0.player_one_score', 4500)
                ->where('game.rounds.0.player_two_score', null)
                ->where('game.rounds.0.location.lat', 48.8566)
                ->where('game.rounds.0.location.lng', 2.3522)
                ->where('game.rounds.0.player_one_guess.lat', 48.9)
                ->where('game.rounds.0.player_one_guess.lng', 2.4)
                ->where('game.rounds.0.player_two_guess', null),
            );
    }

    public function test_rounds_are_returned_in_order(): void
    {
        $game = Game::factory()->create(['status' => GameStatus::Completed]);

        $location = Location::factory()->create(['map_id' => $game->map_id]);

        Round::factory()->create([
            'game_id' => $game->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 2,
            'player_one_score' => 3000,
            'player_two_score' => 2000,
        ]);

        Round::factory()->create([
            'game_id' => $game->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 1,
            'player_one_score' => 4000,
            'player_two_score' => 1000,
        ]);

        $this->get("/games/{$game->getKey()}/summary")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('game.rounds.0.round_number', 1)
                ->where('game.rounds.1.round_number', 2)
                ->where('game.player_one_total_score', 7000)
                ->where('game.player_two_total_score', 3000),
            );
    }

    public function test_non_completed_game_returns_404(): void
    {
        $game = Game::factory()->inProgress()->create();

        $this->get("/games/{$game->getKey()}/summary")
            ->assertNotFound();
    }

    public function test_pending_game_returns_404(): void
    {
        $game = Game::factory()->create(['status' => GameStatus::Pending]);

        $this->get("/games/{$game->getKey()}/summary")
            ->assertNotFound();
    }
}
