<?php

namespace Tests\Feature;

use App\Models\DailyChallenge;
use App\Models\DailyChallengeEntry;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Services\DailyChallengeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DailyChallengeTest extends TestCase
{
    use RefreshDatabase;

    private function setupMap(): Map
    {
        $map = Map::factory()->create(['name' => 'likeacw-mapillary']);
        for ($i = 0; $i < 10; $i++) {
            Location::factory()->for($map)->create();
        }

        return $map;
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

    // --- Today endpoint ---

    public function test_today_returns_challenge_info(): void
    {
        $this->setupMap();

        $response = $this->getJson('/daily-challenge');

        $response->assertOk();
        $response->assertJsonStructure(['challenge_id', 'challenge_date', 'round_count']);
        $response->assertJsonPath('round_count', 5);
    }

    // --- Start endpoint ---

    public function test_start_creates_entry(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");

        $response->assertOk();
        $response->assertJsonStructure(['entry_id', 'round_number', 'total_rounds', 'location']);
        $response->assertJsonPath('round_number', 1);
        $response->assertJsonPath('total_rounds', 5);
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

        DailyChallengeEntry::create([
            'daily_challenge_id' => $challenge->getKey(),
            'player_id' => $player->getKey(),
            'total_score' => 20000,
            'round_scores' => [],
            'rounds_completed' => 5,
            'completed_at' => now(),
        ]);

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
    }

    public function test_guess_completes_after_5_rounds(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();

        $startResponse = $this->postJson("/players/{$player->getKey()}/daily-challenge/start");
        $entryId = $startResponse->json('entry_id');

        // Play through all 5 rounds
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson("/players/{$player->getKey()}/daily-challenge/{$entryId}/guess", [
                'lat' => 48.0 + $i,
                'lng' => 2.0 + $i,
            ]);
        }

        $this->assertTrue($response->json('completed'));
        $this->assertSame(5, $response->json('rounds_completed'));
    }

    public function test_cannot_guess_after_completed(): void
    {
        $this->setupMap();
        $player = Player::factory()->create();
        $challenge = app(DailyChallengeService::class)->getOrCreateForDate();

        $entry = DailyChallengeEntry::create([
            'daily_challenge_id' => $challenge->getKey(),
            'player_id' => $player->getKey(),
            'total_score' => 20000,
            'round_scores' => [],
            'rounds_completed' => 5,
            'completed_at' => now(),
        ]);

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

    // --- Leaderboard ---

    public function test_leaderboard_returns_completed_entries(): void
    {
        $this->setupMap();
        $challenge = app(DailyChallengeService::class)->getOrCreateForDate();

        $player = Player::factory()->create();
        DailyChallengeEntry::create([
            'daily_challenge_id' => $challenge->getKey(),
            'player_id' => $player->getKey(),
            'total_score' => 20000,
            'round_scores' => [],
            'rounds_completed' => 5,
            'completed_at' => now(),
        ]);

        $response = $this->getJson('/daily-challenge/leaderboard');

        $response->assertOk();
        $response->assertJsonCount(1, 'entries');
        $response->assertJsonPath('entries.0.total_score', 20000);
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
    }

    public function test_leaderboard_ordered_by_score_descending(): void
    {
        $this->setupMap();
        $challenge = app(DailyChallengeService::class)->getOrCreateForDate();

        $low = Player::factory()->create();
        $high = Player::factory()->create();

        DailyChallengeEntry::create([
            'daily_challenge_id' => $challenge->getKey(),
            'player_id' => $low->getKey(),
            'total_score' => 10000,
            'round_scores' => [],
            'rounds_completed' => 5,
            'completed_at' => now(),
        ]);

        DailyChallengeEntry::create([
            'daily_challenge_id' => $challenge->getKey(),
            'player_id' => $high->getKey(),
            'total_score' => 25000,
            'round_scores' => [],
            'rounds_completed' => 5,
            'completed_at' => now(),
        ]);

        $response = $this->getJson('/daily-challenge/leaderboard');

        $response->assertOk();
        $entries = $response->json('entries');
        $this->assertSame(25000, $entries[0]['total_score']);
        $this->assertSame(10000, $entries[1]['total_score']);
    }
}
