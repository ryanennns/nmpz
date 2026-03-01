<?php

namespace Tests\Feature;

use App\Models\Achievement;
use App\Models\DailyChallenge;
use App\Models\DailyChallengeEntry;
use App\Models\Player;
use App\Models\PlayerStats;
use App\Services\DailyChallengeService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DailyChallengeTest extends TestCase
{
    use RefreshDatabase;

    private function completeChallenge(Player $player, DailyChallenge $challenge, int $totalScore = 20000): DailyChallengeEntry
    {
        return DailyChallengeEntry::create([
            'daily_challenge_id' => $challenge->getKey(),
            'player_id' => $player->getKey(),
            'total_score' => $totalScore,
            'round_scores' => [],
            'rounds_completed' => 5,
            'completed_at' => now(),
            'tier' => app(DailyChallengeService::class)->calculateTier($totalScore),
        ]);
    }

    // --- DailyChallengeService ---

    public function test_creates_challenge_for_today(): void
    {
        $this->setupMap();

        $challenge = app(DailyChallengeService::class)->getOrCreateForDate();

        $this->assertSame(today()->toDateString(), $challenge->challenge_date->toDateString());
        $this->assertCount(5, $challenge->location_ids);
    }

    public function test_returns_existing_challenge(): void
    {
        $this->setupMap();
        $service = app(DailyChallengeService::class);

        $first = $service->getOrCreateForDate();
        $second = $service->getOrCreateForDate();

        $this->assertSame($first->getKey(), $second->getKey());
    }

    // --- Tier calculation ---

    public function test_tier_gold(): void
    {
        $service = app(DailyChallengeService::class);

        $this->assertSame('gold', $service->calculateTier(22000));
    }

    public function test_tier_silver(): void
    {
        $service = app(DailyChallengeService::class);

        $this->assertSame('silver', $service->calculateTier(17000));
    }

    public function test_tier_bronze(): void
    {
        $service = app(DailyChallengeService::class);

        $this->assertSame('bronze', $service->calculateTier(8000));
    }

    public function test_tier_gold_exact_boundary(): void
    {
        $service = app(DailyChallengeService::class);

        $this->assertSame('gold', $service->calculateTier(20000));
    }

    public function test_tier_silver_exact_boundary(): void
    {
        $service = app(DailyChallengeService::class);

        $this->assertSame('silver', $service->calculateTier(15000));
    }

    // --- Today endpoint ---

    public function test_today_returns_challenge_info(): void
    {
        $this->setupMap();

        $response = $this->getJson('/daily-challenge');

        $response->assertOk();
        $response->assertJsonStructure(['challenge_id', 'challenge_date', 'round_count', 'participants']);
        $response->assertJsonPath('round_count', 5);
        $response->assertJsonPath('participants', 0);
    }

    public function test_today_includes_player_context(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $service = app(DailyChallengeService::class);
        $challenge = $service->getOrCreateForDate();

        $this->completeChallenge($player, $challenge, 22000);
        $service->updateStreak($player);

        $response = $this->getJson("/daily-challenge?player_id={$player->getKey()}");

        $response->assertOk();
        $response->assertJsonPath('player.completed', true);
        $response->assertJsonPath('player.tier', 'gold');
        $response->assertJsonPath('player.total_score', 22000);
        $response->assertJsonPath('player.current_streak', 1);
        $response->assertJsonPath('participants', 1);
    }

    // --- Start endpoint ---

    public function test_start_creates_entry(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");

        $response->assertOk();
        $response->assertJsonStructure(['entry_id', 'round_number', 'total_rounds', 'location', 'round_timeout']);
        $response->assertJsonPath('round_number', 1);
        $response->assertJsonPath('total_rounds', 5);
        $response->assertJsonPath('round_timeout', 60);
    }

    public function test_start_sets_timing_fields(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        $this->postJson("/players/{$player->getKey()}/daily-challenge/start");

        $entry = DailyChallengeEntry::where('player_id', $player->getKey())->first();
        $this->assertNotNull($entry->started_at);
        $this->assertNotNull($entry->round_started_at);
    }

    public function test_start_resumes_existing_entry(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        $first = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");
        $second = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");

        $this->assertSame($first->json('entry_id'), $second->json('entry_id'));
    }

    public function test_cannot_start_if_already_completed(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $challenge = app(DailyChallengeService::class)->getOrCreateForDate();

        $this->completeChallenge($player, $challenge);

        $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");

        $response->assertStatus(422);
    }

    // --- Guess endpoint ---

    public function test_guess_scores_round(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        $startResponse = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");
        $entryId = $startResponse->json('entry_id');
        $location = $startResponse->json('location');

        $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/{$entryId}/guess", [
            'lat' => $location['lat'],
            'lng' => $location['lng'],
        ]);

        $response->assertOk();
        $this->assertGreaterThan(0, $response->json('score'));
        $this->assertSame(1, $response->json('rounds_completed'));
        $this->assertFalse($response->json('completed'));
        $this->assertFalse($response->json('timed_out'));
    }

    public function test_guess_completes_after_5_rounds(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        $startResponse = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");
        $entryId = $startResponse->json('entry_id');

        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/{$entryId}/guess", [
                'lat' => 48.0 + $i,
                'lng' => 2.0 + $i,
            ]);
        }

        $this->assertTrue($response->json('completed'));
        $this->assertSame(5, $response->json('rounds_completed'));
    }

    public function test_guess_returns_tier_on_completion(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        $startResponse = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");
        $entryId = $startResponse->json('entry_id');

        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/{$entryId}/guess", [
                'lat' => 48.0 + $i,
                'lng' => 2.0 + $i,
            ]);
        }

        $this->assertTrue($response->json('completed'));
        $this->assertContains($response->json('tier'), ['gold', 'silver', 'bronze']);
    }

    public function test_guess_returns_streak_on_completion(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        $startResponse = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");
        $entryId = $startResponse->json('entry_id');

        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/{$entryId}/guess", [
                'lat' => 48.0 + $i,
                'lng' => 2.0 + $i,
            ]);
        }

        $this->assertTrue($response->json('completed'));
        $this->assertArrayHasKey('streak', $response->json());
        $this->assertSame(1, $response->json('streak.current_streak'));
        $this->assertSame(1, $response->json('streak.best_streak'));
    }

    public function test_cannot_guess_after_completed(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $challenge = app(DailyChallengeService::class)->getOrCreateForDate();

        $entry = $this->completeChallenge($player, $challenge);

        $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/{$entry->getKey()}/guess", [
            'lat' => 48.0,
            'lng' => 2.0,
        ]);

        $response->assertStatus(422);
    }

    public function test_other_player_cannot_guess_on_entry(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $other = Player::factory()->create();

        $startResponse = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");
        $entryId = $startResponse->json('entry_id');

        $response = $this->postJson("/players/{$other->getKey()}/daily-challenge/{$entryId}/guess", [
            'lat' => 48.0,
            'lng' => 2.0,
        ]);

        $response->assertStatus(403);
    }

    // --- Timer enforcement ---

    public function test_timer_scores_zero_when_expired(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        Carbon::setTestNow(now());

        $startResponse = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");
        $entryId = $startResponse->json('entry_id');
        $location = $startResponse->json('location');

        // Advance past the 60s timeout
        Carbon::setTestNow(now()->addSeconds(61));

        $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/{$entryId}/guess", [
            'lat' => $location['lat'],
            'lng' => $location['lng'],
        ]);

        $response->assertOk();
        $this->assertSame(0, $response->json('score'));
        $this->assertTrue($response->json('timed_out'));

        Carbon::setTestNow();
    }

    public function test_timer_does_not_affect_within_limit(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        Carbon::setTestNow(now());

        $startResponse = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");
        $entryId = $startResponse->json('entry_id');
        $location = $startResponse->json('location');

        // Advance within the timeout
        Carbon::setTestNow(now()->addSeconds(30));

        $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/{$entryId}/guess", [
            'lat' => $location['lat'],
            'lng' => $location['lng'],
        ]);

        $response->assertOk();
        $this->assertGreaterThan(0, $response->json('score'));
        $this->assertFalse($response->json('timed_out'));

        Carbon::setTestNow();
    }

    // --- Streak tracking ---

    public function test_streak_starts_at_one_on_first_completion(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $service = app(DailyChallengeService::class);

        $result = $service->updateStreak($player);

        $this->assertSame(1, $result['current_streak']);
        $this->assertSame(1, $result['best_streak']);
    }

    public function test_streak_increments_on_consecutive_days(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $service = app(DailyChallengeService::class);

        // Complete yesterday's challenge
        Carbon::setTestNow(today()->subDay());
        $yesterdayChallenge = $service->getOrCreateForDate();
        $this->completeChallenge($player, $yesterdayChallenge);
        $service->updateStreak($player);

        // Complete today's challenge
        Carbon::setTestNow(today()->addDay());
        $todayChallenge = $service->getOrCreateForDate();
        $this->completeChallenge($player, $todayChallenge);
        $result = $service->updateStreak($player);

        $this->assertSame(2, $result['current_streak']);
        $this->assertSame(2, $result['best_streak']);

        Carbon::setTestNow();
    }

    public function test_streak_resets_when_day_missed(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $service = app(DailyChallengeService::class);

        // Complete challenge 2 days ago
        Carbon::setTestNow(today()->subDays(2));
        $oldChallenge = $service->getOrCreateForDate();
        $this->completeChallenge($player, $oldChallenge);
        $service->updateStreak($player);

        // Skip yesterday, complete today
        Carbon::setTestNow(today()->addDays(2));
        $todayChallenge = $service->getOrCreateForDate();
        $this->completeChallenge($player, $todayChallenge);
        $result = $service->updateStreak($player);

        $this->assertSame(1, $result['current_streak']);

        Carbon::setTestNow();
    }

    public function test_best_streak_preserved_when_current_resets(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $service = app(DailyChallengeService::class);
        $baseDate = Carbon::parse('2026-02-20');

        // Build a streak of 2
        Carbon::setTestNow($baseDate);
        $day1Challenge = $service->getOrCreateForDate();
        $this->completeChallenge($player, $day1Challenge);
        $service->updateStreak($player);

        Carbon::setTestNow($baseDate->copy()->addDay());
        $day2Challenge = $service->getOrCreateForDate();
        $this->completeChallenge($player, $day2Challenge);
        $service->updateStreak($player);

        // Skip a day, then complete again
        Carbon::setTestNow($baseDate->copy()->addDays(3));
        $day4Challenge = $service->getOrCreateForDate();
        $this->completeChallenge($player, $day4Challenge);
        $result = $service->updateStreak($player);

        $this->assertSame(1, $result['current_streak']);
        $this->assertSame(2, $result['best_streak']);

        Carbon::setTestNow();
    }

    // --- Leaderboard ---

    public function test_leaderboard_returns_completed_entries(): void
    {
        $this->setupMap();
        $challenge = app(DailyChallengeService::class)->getOrCreateForDate();

        $player = Player::factory()->create();
        $this->completeChallenge($player, $challenge);

        $response = $this->getJson('/daily-challenge/leaderboard');

        $response->assertOk();
        $response->assertJsonCount(1, 'entries');
        $response->assertJsonPath('entries.0.total_score', 20000);
        $response->assertJsonPath('entries.0.rank', 1);
        $response->assertJsonPath('entries.0.tier', 'gold');
        $response->assertJsonPath('total_participants', 1);
    }

    public function test_leaderboard_excludes_incomplete_entries(): void
    {
        $this->setupMap();
        $challenge = app(DailyChallengeService::class)->getOrCreateForDate();

        $player = Player::factory()->create();
        DailyChallengeEntry::create([
            'daily_challenge_id' => $challenge->getKey(),
            'player_id' => $player->getKey(),
            'total_score' => 5000,
            'round_scores' => [],
            'rounds_completed' => 2,
        ]);

        $response = $this->getJson('/daily-challenge/leaderboard');

        $response->assertOk();
        $response->assertJsonCount(0, 'entries');
        $response->assertJsonPath('total_participants', 0);
    }

    public function test_leaderboard_ordered_by_score_descending(): void
    {
        $this->setupMap();
        $challenge = app(DailyChallengeService::class)->getOrCreateForDate();

        $low = Player::factory()->create();
        $high = Player::factory()->create();

        $this->completeChallenge($low, $challenge, 10000);
        $this->completeChallenge($high, $challenge, 25000);

        $response = $this->getJson('/daily-challenge/leaderboard');

        $response->assertOk();
        $entries = $response->json('entries');
        $this->assertSame(25000, $entries[0]['total_score']);
        $this->assertSame(10000, $entries[1]['total_score']);
        $this->assertSame(1, $entries[0]['rank']);
        $this->assertSame(2, $entries[1]['rank']);
    }

    // --- Stats endpoint ---

    public function test_stats_returns_aggregate_data(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $service = app(DailyChallengeService::class);
        $baseDate = Carbon::parse('2026-02-20');

        // Complete 3 challenges on consecutive days
        Carbon::setTestNow($baseDate);
        $c1 = $service->getOrCreateForDate();
        $this->completeChallenge($player, $c1, 22000); // gold
        $service->updateStreak($player);

        Carbon::setTestNow($baseDate->copy()->addDay());
        $c2 = $service->getOrCreateForDate();
        $this->completeChallenge($player, $c2, 17000); // silver
        $service->updateStreak($player);

        Carbon::setTestNow($baseDate->copy()->addDays(2));
        $c3 = $service->getOrCreateForDate();
        $this->completeChallenge($player, $c3, 8000); // bronze
        $service->updateStreak($player);

        $response = $this->getJson("/players/{$player->getKey()}/daily-challenge/stats");

        $response->assertOk();
        $response->assertJsonPath('current_streak', 3);
        $response->assertJsonPath('best_streak', 3);
        $response->assertJsonPath('challenges_completed', 3);
        $response->assertJsonPath('tier_counts.gold', 1);
        $response->assertJsonPath('tier_counts.silver', 1);
        $response->assertJsonPath('tier_counts.bronze', 1);

        Carbon::setTestNow();
    }

    // --- Reset ---

    public function test_reset_deletes_entry_and_allows_replay(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $challenge = app(DailyChallengeService::class)->getOrCreateForDate();

        $this->completeChallenge($player, $challenge);

        // Cannot start again
        $this->postJson("/players/{$player->getKey()}/daily-challenge/start")
            ->assertStatus(422);

        // Reset
        $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/reset");
        $response->assertOk();
        $response->assertJsonPath('reset', true);

        // Can start again
        $this->postJson("/players/{$player->getKey()}/daily-challenge/start")
            ->assertOk();
    }

    public function test_reset_with_no_entry_returns_error(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/reset");

        $response->assertStatus(422);
        $response->assertJsonPath('error', 'No entry to reset');
    }

    // --- Achievement ---

    public function test_daily_devotee_awarded_after_7_completions(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $service = app(DailyChallengeService::class);
        $baseDate = Carbon::parse('2026-02-15');

        Achievement::create([
            'key' => 'daily_devotee',
            'name' => 'Daily Devotee',
            'description' => 'Complete 7 daily challenges',
            'icon' => 'calendar',
        ]);

        // Complete 7 challenges across 7 consecutive days via the guess endpoint
        for ($day = 0; $day < 7; $day++) {
            Carbon::setTestNow($baseDate->copy()->addDays($day));
            $challenge = $service->getOrCreateForDate();

            $startResponse = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");
            $entryId = $startResponse->json('entry_id');

            for ($i = 0; $i < 5; $i++) {
                $this->postJson("/players/{$player->getKey()}/daily-challenge/{$entryId}/guess", [
                    'lat' => 48.0 + $i,
                    'lng' => 2.0 + $i,
                ]);
            }
        }

        $this->assertDatabaseHas('player_achievements', [
            'player_id' => $player->getKey(),
        ]);

        Carbon::setTestNow();
    }
}
