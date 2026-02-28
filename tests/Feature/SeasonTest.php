<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\Season;
use App\Models\SeasonResult;
use App\Services\SeasonService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeasonTest extends TestCase
{
    use RefreshDatabase;

    // --- SeasonService ---

    public function test_start_new_season_creates_season(): void
    {
        $season = app(SeasonService::class)->startNewSeason();

        $this->assertSame(1, $season->season_number);
        $this->assertTrue($season->is_active);
        $this->assertSame(today()->toDateString(), $season->start_date->toDateString());
    }

    public function test_start_new_season_increments_number(): void
    {
        $first = app(SeasonService::class)->startNewSeason();
        $first->update(['is_active' => false]);
        $second = app(SeasonService::class)->startNewSeason($first);

        $this->assertSame(2, $second->season_number);
    }

    public function test_start_new_season_resets_elo_toward_1000(): void
    {
        $highPlayer = Player::factory()->withElo(1600)->create();
        $lowPlayer = Player::factory()->withElo(600)->create();

        app(SeasonService::class)->startNewSeason();

        $highPlayer->refresh();
        $lowPlayer->refresh();
        // 1000 + (1600-1000)*0.5 = 1300
        $this->assertSame(1300, $highPlayer->elo_rating);
        // 1000 + (600-1000)*0.5 = 800
        $this->assertSame(800, $lowPlayer->elo_rating);
    }

    public function test_end_season_archives_results(): void
    {
        $player = Player::factory()->withElo(1500)->create();
        $season = Season::create([
            'season_number' => 1,
            'start_date' => today()->subMonth(),
            'end_date' => today()->subDay(),
            'is_active' => true,
        ]);

        app(SeasonService::class)->endSeason($season);

        $season->refresh();
        $this->assertFalse($season->is_active);
        $this->assertDatabaseHas('season_results', [
            'season_id' => $season->getKey(),
            'player_id' => $player->getKey(),
            'final_elo' => 1500,
        ]);
    }

    public function test_rotate_season_ends_current_and_starts_new(): void
    {
        $current = Season::create([
            'season_number' => 1,
            'start_date' => today()->subMonth(),
            'end_date' => today()->subDay(),
            'is_active' => true,
        ]);

        $newSeason = app(SeasonService::class)->rotateSeason();

        $current->refresh();
        $this->assertFalse($current->is_active);
        $this->assertSame(2, $newSeason->season_number);
        $this->assertTrue($newSeason->is_active);
    }

    // --- Endpoints ---

    public function test_current_returns_active_season(): void
    {
        Season::create([
            'season_number' => 1,
            'start_date' => today(),
            'end_date' => today()->addMonth(),
            'is_active' => true,
        ]);

        $response = $this->getJson('/seasons/current');

        $response->assertOk();
        $response->assertJsonPath('season.season_number', 1);
        $this->assertArrayHasKey('days_remaining', $response->json('season'));
    }

    public function test_current_returns_null_when_no_active_season(): void
    {
        $response = $this->getJson('/seasons/current');

        $response->assertOk();
        $response->assertJsonPath('season', null);
    }

    public function test_season_leaderboard_returns_results(): void
    {
        $season = Season::create([
            'season_number' => 1,
            'start_date' => today()->subMonth(),
            'end_date' => today(),
            'is_active' => false,
        ]);
        $player = Player::factory()->create();
        SeasonResult::create([
            'season_id' => $season->getKey(),
            'player_id' => $player->getKey(),
            'peak_elo' => 1800,
            'final_elo' => 1700,
            'peak_rank' => 'Diamond',
            'games_played' => 50,
            'games_won' => 30,
        ]);

        $response = $this->getJson("/seasons/{$season->getKey()}/leaderboard");

        $response->assertOk();
        $response->assertJsonCount(1, 'results');
        $response->assertJsonPath('results.0.peak_elo', 1800);
    }

    public function test_history_returns_past_seasons(): void
    {
        Season::create([
            'season_number' => 1,
            'start_date' => today()->subMonths(2),
            'end_date' => today()->subMonth(),
            'is_active' => false,
        ]);

        $response = $this->getJson('/seasons/history');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.season_number', 1);
    }

    public function test_history_excludes_active_season(): void
    {
        Season::create([
            'season_number' => 1,
            'start_date' => today(),
            'end_date' => today()->addMonth(),
            'is_active' => true,
        ]);

        $response = $this->getJson('/seasons/history');

        $response->assertOk();
        $response->assertJsonCount(0);
    }
}
