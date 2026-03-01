<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class StatsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_stats_with_all_fields(): void
    {
        $response = $this->getJson('/stats')
            ->assertOk();

        $data = $response->json();
        $this->assertArrayHasKey('games_in_progress', $data);
        $this->assertArrayHasKey('rounds_played', $data);
        $this->assertArrayHasKey('total_players', $data);
        $this->assertArrayHasKey('queue_count', $data);
    }

    public function test_counts_in_progress_games(): void
    {
        Game::factory()->inProgress()->count(3)->create();
        Game::factory()->completed()->count(2)->create();

        $response = $this->getJson('/stats')->assertOk();

        $this->assertSame(3, $response->json('games_in_progress'));
    }

    public function test_counts_finished_rounds(): void
    {
        $game = Game::factory()->inProgress()->create();
        Round::factory()->for($game)->create(['round_number' => 1, 'finished_at' => now()]);
        Round::factory()->for($game)->create(['round_number' => 2, 'finished_at' => now()]);
        Round::factory()->for($game)->create(['round_number' => 3, 'finished_at' => null]);

        $response = $this->getJson('/stats')->assertOk();

        $this->assertSame(2, $response->json('rounds_played'));
    }

    public function test_counts_total_players(): void
    {
        Player::factory()->count(5)->create();

        $response = $this->getJson('/stats')->assertOk();

        // Additional players may be created by Game factories
        $this->assertGreaterThanOrEqual(5, $response->json('total_players'));
    }

    public function test_counts_queue_from_cache(): void
    {
        Cache::put('matchmaking_queue', ['a', 'b', 'c', 'd']);

        $response = $this->getJson('/stats')->assertOk();

        $this->assertSame(4, $response->json('queue_count'));
    }

    public function test_returns_zero_queue_when_cache_is_empty(): void
    {
        Cache::forget('matchmaking_queue');

        $response = $this->getJson('/stats')->assertOk();

        $this->assertSame(0, $response->json('queue_count'));
    }
}
