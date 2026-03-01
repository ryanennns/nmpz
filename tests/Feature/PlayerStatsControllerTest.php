<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\PlayerStats;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlayerStatsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_zeroed_stats_when_no_stats_exist(): void
    {
        $player = Player::factory()->create();

        $response = $this->getJson("/players/{$player->getKey()}/stats")
            ->assertOk();

        $data = $response->json();
        $this->assertSame(0, $data['games_played']);
        $this->assertSame(0, $data['games_won']);
        $this->assertSame(0, $data['games_lost']);
        $this->assertNull($data['closest_guess_km']);
        $this->assertArrayHasKey('elo_rating', $data);
        $this->assertArrayHasKey('rank', $data);
    }

    public function test_returns_existing_stats(): void
    {
        $player = Player::factory()->withElo(1300)->create();
        PlayerStats::create([
            'player_id' => $player->getKey(),
            'games_played' => 10,
            'games_won' => 7,
            'games_lost' => 3,
            'total_rounds' => 50,
            'total_score' => 200000,
            'best_round_score' => 4800,
            'total_damage_dealt' => 15000,
            'total_damage_taken' => 8000,
            'current_win_streak' => 3,
            'best_win_streak' => 5,
            'perfect_rounds' => 2,
            'closest_guess_km' => 0.15,
            'total_distance_km' => 500.5,
            'total_guesses_made' => 45,
            'total_guesses_missed' => 5,
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/stats")
            ->assertOk();

        $data = $response->json();
        $this->assertSame(10, $data['games_played']);
        $this->assertSame(7, $data['games_won']);
        $this->assertSame(3, $data['games_lost']);
        $this->assertSame(4800, $data['best_round_score']);
        $this->assertSame(1300, $data['elo_rating']);
    }

    public function test_includes_computed_attributes(): void
    {
        $player = Player::factory()->create();
        PlayerStats::create([
            'player_id' => $player->getKey(),
            'games_played' => 10,
            'games_won' => 7,
            'games_lost' => 3,
            'total_rounds' => 50,
            'total_score' => 200000,
            'total_guesses_made' => 45,
            'total_distance_km' => 500.5,
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/stats")
            ->assertOk();

        $data = $response->json();
        $this->assertArrayHasKey('win_rate', $data);
        $this->assertArrayHasKey('average_score', $data);
        $this->assertArrayHasKey('average_distance_km', $data);
        $this->assertEquals(70.0, $data['win_rate']);
    }

    public function test_returns_404_for_nonexistent_player(): void
    {
        $this->getJson('/players/nonexistent-id/stats')
            ->assertNotFound();
    }
}
