<?php

namespace Tests\Feature;

use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\SoloGame;
use App\Models\SoloRound;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GetSoloGameRoundTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_owned_games_require_the_matching_player_id_payload(): void
    {
        $player = Player::factory()->create();
        $map = Map::query()->create(['name' => 'likeacw-mapillary']);
        $location = Location::factory()->create();
        $map->locations()->attach($location->getKey());
        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
        ]);
        SoloRound::query()->create([
            'solo_game_id' => $game->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 1,
        ]);

        $this->postJson("/singleplayer/{$game->getKey()}/round")
            ->assertUnauthorized();

        $this->postJson("/singleplayer/{$game->getKey()}/round", [
            'player_id' => (string) str()->uuid(),
        ])->assertUnauthorized();
    }

    public function test_it_returns_the_current_round_and_completed_rounds_for_guest_games(): void
    {
        $player = Player::factory()->create();
        $map = Map::query()->create(['name' => 'likeacw-mapillary']);
        $firstLocation = Location::factory()->create([
            'lat' => 40.7128,
            'lng' => -74.0060,
            'heading' => 180,
            'image_id' => 'image-1',
        ]);
        $map->locations()->attach($firstLocation->getKey());
        $secondLocation = Location::factory()->create([
            'lat' => 34.0522,
            'lng' => -118.2437,
            'heading' => 90,
            'image_id' => 'image-2',
        ]);
        $map->locations()->attach($secondLocation->getKey());

        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
        ]);
        SoloRound::query()->create([
            'solo_game_id' => $game->getKey(),
            'location_id' => $firstLocation->getKey(),
            'round_number' => 1,
            'guess_lat' => 40.73,
            'guess_lng' => -73.93,
            'score' => 4321,
            'distance_km' => 12.3,
            'finished_at' => now(),
        ]);
        $currentRound = SoloRound::query()->create([
            'solo_game_id' => $game->getKey(),
            'location_id' => $secondLocation->getKey(),
            'round_number' => 2,
        ]);

        $this->postJson("/singleplayer/{$game->getKey()}/round", [
            'player_id' => $player->getKey(),
        ])->assertOk()
            ->assertJsonPath('game_complete', false)
            ->assertJsonPath('current_round.id', $currentRound->getKey())
            ->assertJsonPath('current_round.round_number', 2)
            ->assertJsonPath('completed_rounds.0.round_number', 1)
            ->assertJsonPath('completed_rounds.0.score', 4321)
            ->assertJsonPath('completed_rounds.0.location.image_id', 'image-1')
            ->assertJsonPath('highest_singleplayer_score', 0);
    }

    public function test_user_owned_games_require_the_matching_authenticated_user(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create([
            'user_id' => $user->getKey(),
        ]);
        $map = Map::query()->create(['name' => 'likeacw-mapillary']);
        $location = Location::factory()->create();
        $map->locations()->attach($location->getKey());
        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
        ]);
        SoloRound::query()->create([
            'solo_game_id' => $game->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 1,
        ]);

        $this->postJson("/singleplayer/{$game->getKey()}/round")
            ->assertUnauthorized();

        $this->actingAs($user)
            ->postJson("/singleplayer/{$game->getKey()}/round")
            ->assertOk();
    }

    public function test_it_returns_highest_singleplayer_score_for_the_player(): void
    {
        $player = Player::factory()->create();
        $map = Map::query()->create(['name' => 'likeacw-mapillary']);
        $location = Location::factory()->create();
        $map->locations()->attach($location->getKey());

        $bestGame = SoloGame::query()->create([
            'player_id' => $player->getKey(),
            'status' => 'completed',
        ]);
        SoloRound::query()->create([
            'solo_game_id' => $bestGame->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 1,
            'score' => 4200,
            'finished_at' => now(),
        ]);

        $currentGame = SoloGame::query()->create([
            'player_id' => $player->getKey(),
            'status' => 'in_progress',
        ]);
        SoloRound::query()->create([
            'solo_game_id' => $currentGame->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 1,
        ]);

        $this->postJson("/singleplayer/{$currentGame->getKey()}/round", [
            'player_id' => $player->getKey(),
        ])->assertOk()
            ->assertJsonPath('highest_singleplayer_score', 4200);
    }
}
