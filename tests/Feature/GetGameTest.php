<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GetGameTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_in_game_can_load_the_active_game(): void
    {
        $map = Map::factory()->create();
        $playerOne = Player::factory()->create(['name' => 'Alpha']);
        $playerTwo = Player::factory()->create(['name' => 'Bravo']);

        $game = Game::factory()->inProgress()->create([
            'map_id' => $map->getKey(),
            'player_one_id' => $playerOne->getKey(),
            'player_two_id' => $playerTwo->getKey(),
            'seed' => 7,
            'player_one_health' => 4300,
            'player_two_health' => 3900,
        ]);

        $location = Location::factory()->create([
            'map_id' => $map->getKey(),
            'lat' => 49.2827,
            'lng' => -123.1207,
            'heading' => 180,
            'image_id' => 'image-123',
        ]);

        $round = Round::factory()->create([
            'game_id' => $game->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 2,
            'started_at' => now(),
            'player_one_locked_in' => true,
            'player_two_locked_in' => false,
        ]);

        $response = $this->get("/game/{$game->getKey()}?player={$playerOne->getKey()}");

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->where('player.id', $playerOne->getKey())
                ->where('game.id', $game->getKey())
                ->where('game.player_one.id', $playerOne->getKey())
                ->where('game.player_one.name', 'Alpha')
                ->where('game.player_two.id', $playerTwo->getKey())
                ->where('game.player_two.name', 'Bravo')
                ->where('game.player_one_health', 4300)
                ->where('game.player_two_health', 3900)
                ->where('round_data.game_id', $game->getKey())
                ->where('round_data.round_id', $round->getKey())
                ->where('round_data.round_number', 2)
                ->where('round_data.location_lat', 49.2827)
                ->where('round_data.location_lng', -123.1207)
                ->where('round_data.location_heading', 180)
                ->where('round_data.location_image_id', 'image-123')
                ->where('round_data.player_one_locked_in', true)
                ->where('round_data.player_two_locked_in', false),
            );
    }

    public function test_request_is_rejected_when_player_is_not_in_the_game(): void
    {
        $game = Game::factory()->inProgress()->create();
        $outsider = Player::factory()->create();

        $this->get("/game/{$game->getKey()}?player={$outsider->getKey()}")
            ->assertStatus(422);
    }

    public function test_request_is_rejected_when_game_is_not_in_progress(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create([
            'status' => GameStatus::Pending,
            'player_one_id' => $player->getKey(),
        ]);

        $this->get("/game/{$game->getKey()}?player={$player->getKey()}")
            ->assertStatus(422);
    }
}
