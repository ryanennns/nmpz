<?php

namespace Tests\Feature;

use App\Models\Location;
use App\Models\Map;
use App\Models\Round;
use App\Models\Player;
use App\Models\SoloGame;
use App\Models\SoloRound;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SoloGameGuessTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_scores_a_round_and_returns_the_next_round(): void
    {
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

        $player = Player::factory()->create();
        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
        ]);
        $round = SoloRound::query()->create([
            'solo_game_id' => $game->getKey(),
            'location_id' => $firstLocation->getKey(),
            'round_number' => 1,
        ]);
        $nextRound = SoloRound::query()->create([
            'solo_game_id' => $game->getKey(),
            'location_id' => $secondLocation->getKey(),
            'round_number' => 2,
        ]);

        $guess = ['lat' => 40.73061, 'lng' => -73.935242];
        $expectedDistance = Round::calculateDistanceKm(
            $firstLocation->lat,
            $firstLocation->lng,
            $guess['lat'],
            $guess['lng'],
        );
        $expectedScore = Round::calculateScore(
            $firstLocation->lat,
            $firstLocation->lng,
            $guess['lat'],
            $guess['lng'],
        );

        $this->postJson("/singleplayer/{$game->getKey()}/guess", [
            'player_id' => $player->getKey(),
            'round_id' => $round->getKey(),
            ...$guess,
        ])->assertOk()
            ->assertJsonPath('score', $expectedScore)
            ->assertJsonPath('total_score', $expectedScore)
            ->assertJsonPath('game_complete', false)
            ->assertJsonPath('next_round.id', $nextRound->getKey())
            ->assertJsonPath('next_round.round_number', 2)
            ->assertJsonPath('guess.lat', $guess['lat'])
            ->assertJsonPath('guess.lng', $guess['lng']);

        $round->refresh();

        $this->assertSame($expectedScore, $round->score);
        $this->assertEqualsWithDelta($expectedDistance, $round->distance_km, 0.01);
        $this->assertEqualsWithDelta($guess['lat'], $round->guess_lat, 0.000001);
        $this->assertEqualsWithDelta($guess['lng'], $round->guess_lng, 0.000001);
        $this->assertNotNull($round->finished_at);
        $this->assertSame('in_progress', $game->fresh()->status);
    }

    public function test_it_completes_the_game_on_the_final_round(): void
    {
        $map = Map::query()->create(['name' => 'likeacw-mapillary']);
        $location = Location::factory()->create([
            'lat' => 51.5074,
            'lng' => -0.1278,
        ]);
        $map->locations()->attach($location->getKey());

        $player = Player::factory()->create();
        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
        ]);
        $round = SoloRound::query()->create([
            'solo_game_id' => $game->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 5,
        ]);

        $guess = ['lat' => 51.5, 'lng' => -0.12];
        $expectedScore = Round::calculateScore(
            $location->lat,
            $location->lng,
            $guess['lat'],
            $guess['lng'],
        );

        $this->postJson("/singleplayer/{$game->getKey()}/guess", [
            'player_id' => $player->getKey(),
            'round_id' => $round->getKey(),
            ...$guess,
        ])->assertOk()
            ->assertJsonPath('score', $expectedScore)
            ->assertJsonPath('total_score', $expectedScore)
            ->assertJsonPath('game_complete', true)
            ->assertJsonPath('next_round', null);

        $this->assertSame('completed', $game->fresh()->status);
    }

    public function test_it_rejects_guesses_for_completed_games(): void
    {
        $player = Player::factory()->create();
        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
            'status' => 'completed',
        ]);

        $this->postJson("/singleplayer/{$game->getKey()}/guess", [
            'player_id' => $player->getKey(),
            'round_id' => (string) str()->uuid(),
            'lat' => 1,
            'lng' => 1,
        ])->assertStatus(409);
    }

    public function test_guest_owned_games_require_the_matching_player_id(): void
    {
        $player = Player::factory()->create();
        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
        ]);

        $this->postJson("/singleplayer/{$game->getKey()}/guess", [
            'round_id' => (string) str()->uuid(),
            'lat' => 1,
            'lng' => 1,
        ])->assertStatus(401);
    }

    public function test_user_owned_games_require_the_matching_authenticated_user(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create([
            'user_id' => $user->getKey(),
        ]);
        $game = SoloGame::query()->create([
            'player_id' => $player->getKey(),
        ]);

        $this->postJson("/singleplayer/{$game->getKey()}/guess", [
            'round_id' => (string) str()->uuid(),
            'lat' => 1,
            'lng' => 1,
        ])->assertUnauthorized();
    }
}
