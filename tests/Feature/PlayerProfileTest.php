<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\PlayerStats;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlayerProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_player_profile(): void
    {
        $player = Player::factory()->withElo(1500)->create();

        $response = $this->getJson("/players/{$player->getKey()}/profile");

        $response->assertOk();
        $response->assertJsonPath('player_id', $player->getKey());
        $response->assertJsonPath('elo_rating', 1500);
        $response->assertJsonPath('rank', 'Platinum');
        $response->assertJsonStructure([
            'name', 'stats', 'elo_history', 'achievements', 'map_stats',
        ]);
    }

    public function test_returns_stats(): void
    {
        $player = Player::factory()->create();
        PlayerStats::create([
            'player_id' => $player->getKey(),
            'games_played' => 50,
            'games_won' => 30,
            'best_win_streak' => 7,
            'best_round_score' => 5000,
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/profile");

        $response->assertOk();
        $response->assertJsonPath('stats.games_played', 50);
        $response->assertJsonPath('stats.games_won', 30);
        $response->assertJsonPath('stats.best_win_streak', 7);
    }

    public function test_returns_404_for_nonexistent_player(): void
    {
        $response = $this->getJson('/players/00000000-0000-0000-0000-000000000000/profile');

        $response->assertNotFound();
    }

    public function test_default_stats_when_no_stats_record(): void
    {
        $player = Player::factory()->create();

        $response = $this->getJson("/players/{$player->getKey()}/profile");

        $response->assertOk();
        $response->assertJsonPath('stats.games_played', 0);
        $response->assertJsonPath('stats.games_won', 0);
    }
}
