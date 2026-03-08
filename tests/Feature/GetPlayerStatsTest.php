<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\SoloGame;
use App\Models\SoloRound;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GetPlayerStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_stats_for_player_with_no_games(): void
    {
        $player = Player::factory()->create(['elo_rating' => 1000]);

        $this->getJson("/players/{$player->id}/stats")
            ->assertOk()
            ->assertExactJson([
                'wins' => 0,
                'losses' => 0,
                'draws' => 0,
                'elo' => 1000,
                'highest_singleplayer_score' => 0,
                'recent_matches' => [],
            ]);
    }

    public function test_counts_wins_losses_and_draws(): void
    {
        $player = Player::factory()->create(['elo_rating' => 1150]);
        $opponent = Player::factory()->create();

        // 2 wins
        Game::factory()->create([
            'player_one_id' => $player->id,
            'player_two_id' => $opponent->id,
            'winner_id' => $player->id,
            'status' => 'completed',
        ]);
        Game::factory()->create([
            'player_one_id' => $opponent->id,
            'player_two_id' => $player->id,
            'winner_id' => $player->id,
            'status' => 'completed',
        ]);

        // 1 loss
        Game::factory()->create([
            'player_one_id' => $player->id,
            'player_two_id' => $opponent->id,
            'winner_id' => $opponent->id,
            'status' => 'completed',
        ]);

        // 1 draw (completed, no winner)
        Game::factory()->create([
            'player_one_id' => $player->id,
            'player_two_id' => $opponent->id,
            'winner_id' => null,
            'status' => 'completed',
        ]);

        $response = $this->getJson("/players/{$player->id}/stats")
            ->assertOk();

        $response->assertJsonPath('wins', 2);
        $response->assertJsonPath('losses', 1);
        $response->assertJsonPath('draws', 1);
        $response->assertJsonPath('elo', 1150);
        $response->assertJsonPath('highest_singleplayer_score', 0);
    }

    public function test_does_not_count_in_progress_games(): void
    {
        $player = Player::factory()->create();
        $opponent = Player::factory()->create();

        Game::factory()->inProgress()->create([
            'player_one_id' => $player->id,
            'player_two_id' => $opponent->id,
        ]);

        $this->getJson("/players/{$player->id}/stats")
            ->assertOk()
            ->assertJsonPath('wins', 0)
            ->assertJsonPath('losses', 0)
            ->assertJsonPath('draws', 0)
            ->assertJsonPath('recent_matches', []);
    }

    public function test_recent_matches_returns_opponent_name_and_result(): void
    {
        $player = Player::factory()->create(['name' => 'Alice']);
        $opponent = Player::factory()->create(['name' => 'Bob']);

        Game::factory()->create([
            'player_one_id' => $player->id,
            'player_two_id' => $opponent->id,
            'winner_id' => $player->id,
            'status' => 'completed',
        ]);

        $response = $this->getJson("/players/{$player->id}/stats")
            ->assertOk();

        $matches = $response->json('recent_matches');
        $this->assertCount(1, $matches);
        $this->assertEquals('Bob', $matches[0]['opponent_name']);
        $this->assertEquals('win', $matches[0]['result']);
        $this->assertArrayHasKey('played_at', $matches[0]);
        $this->assertArrayHasKey('game_id', $matches[0]);
    }

    public function test_recent_matches_limited_to_10_and_ordered_by_latest(): void
    {
        $player = Player::factory()->create();
        $opponent = Player::factory()->create();

        for ($i = 0; $i < 12; $i++) {
            Game::factory()->create([
                'player_one_id' => $player->id,
                'player_two_id' => $opponent->id,
                'winner_id' => $player->id,
                'status' => 'completed',
                'created_at' => now()->subMinutes(12 - $i),
            ]);
        }

        $response = $this->getJson("/players/{$player->id}/stats")
            ->assertOk();

        $matches = $response->json('recent_matches');
        $this->assertCount(10, $matches);

        // Verify ordered by most recent first
        $dates = array_column($matches, 'played_at');
        $sorted = $dates;
        usort($sorted, fn ($a, $b) => strtotime($b) - strtotime($a));
        $this->assertEquals($sorted, $dates);
    }

    public function test_does_not_include_other_players_games(): void
    {
        $player = Player::factory()->create();
        $otherPlayerA = Player::factory()->create();
        $otherPlayerB = Player::factory()->create();

        Game::factory()->create([
            'player_one_id' => $otherPlayerA->id,
            'player_two_id' => $otherPlayerB->id,
            'winner_id' => $otherPlayerA->id,
            'status' => 'completed',
        ]);

        $this->getJson("/players/{$player->id}/stats")
            ->assertOk()
            ->assertJsonPath('wins', 0)
            ->assertJsonPath('losses', 0)
            ->assertJsonPath('recent_matches', []);
    }

    public function test_returns_404_for_nonexistent_player(): void
    {
        $this->getJson('/players/nonexistent-uuid/stats')
            ->assertNotFound();
    }

    public function test_returns_highest_singleplayer_score(): void
    {
        $player = Player::factory()->create();
        $map = Map::query()->create(['name' => 'likeacw-mapillary']);
        $location = Location::factory()->create();
        $map->locations()->attach($location->getKey());

        $firstGame = SoloGame::query()->create([
            'player_id' => $player->getKey(),
            'status' => 'completed',
        ]);
        $secondGame = SoloGame::query()->create([
            'player_id' => $player->getKey(),
            'status' => 'completed',
        ]);

        SoloRound::query()->create([
            'solo_game_id' => $firstGame->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 1,
            'score' => 4000,
            'finished_at' => now(),
        ]);
        SoloRound::query()->create([
            'solo_game_id' => $firstGame->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 2,
            'score' => 3800,
            'finished_at' => now(),
        ]);
        SoloRound::query()->create([
            'solo_game_id' => $secondGame->getKey(),
            'location_id' => $location->getKey(),
            'round_number' => 1,
            'score' => 4999,
            'finished_at' => now(),
        ]);

        $this->getJson("/players/{$player->id}/stats")
            ->assertOk()
            ->assertJsonPath('highest_singleplayer_score', 7800);
    }
}
