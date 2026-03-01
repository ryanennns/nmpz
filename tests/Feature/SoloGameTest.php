<?php

namespace Tests\Feature;

use App\Models\Achievement;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\PlayerStats;
use App\Models\SoloGame;
use App\Models\SoloPersonalBest;
use App\Services\SoloGameService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SoloGameTest extends TestCase
{
    use RefreshDatabase;

    private function setupSoloAchievements(): void
    {
        $this->seedAchievements([
            ['key' => 'solo_first_game', 'name' => 'Solo Debut', 'description' => 'Complete your first solo game'],
            ['key' => 'solo_streak_10', 'name' => 'On a Roll', 'description' => 'Survive 10 rounds in Streak mode'],
            ['key' => 'solo_streak_25', 'name' => 'Unstoppable Force', 'description' => 'Survive 25 rounds in Streak mode'],
            ['key' => 'solo_perfect_round', 'name' => 'Solo Bullseye', 'description' => 'Score 5000 in a solo round'],
            ['key' => 'solo_time_attack_master', 'name' => 'Speed Demon', 'description' => 'Score 25,000+ in Time Attack mode'],
            ['key' => 'solo_explorer_100', 'name' => 'World Traveler', 'description' => 'Complete 100 rounds in Explorer mode'],
            ['key' => 'solo_marathon', 'name' => 'Marathon Runner', 'description' => 'Play 50 solo games'],
            ['key' => 'solo_perfectionist', 'name' => 'Perfectionist', 'description' => 'Earn Gold tier in Perfect Score mode'],
        ]);
    }

    // ─── START TESTS ───

    public function test_start_explorer_mode(): void
    {
        $map = $this->setupMap(50);
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 10,
            'round_timeout' => 60,
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'game_id', 'mode', 'round_number', 'total_rounds', 'health',
            'current_score', 'round_timeout', 'location' => ['lat', 'lng', 'heading'],
        ]);
        $response->assertJson([
            'mode' => 'explorer',
            'round_number' => 1,
            'total_rounds' => 10,
            'health' => null,
            'current_score' => 0,
            'round_timeout' => 60,
        ]);
    }

    public function test_start_streak_mode(): void
    {
        $map = $this->setupMap(50);
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'streak',
            'difficulty' => 'normal',
        ]);

        $response->assertOk();
        $response->assertJson([
            'mode' => 'streak',
            'difficulty' => 'normal',
            'health' => 5000,
            'total_rounds' => null,
            'round_timeout' => 60,
        ]);
    }

    public function test_start_streak_casual_difficulty(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'streak',
            'difficulty' => 'casual',
        ]);

        $response->assertOk();
        $response->assertJson(['health' => 10000]);
    }

    public function test_start_streak_hardcore_difficulty(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'streak',
            'difficulty' => 'hardcore',
        ]);

        $response->assertOk();
        $response->assertJson(['health' => 2500]);
    }

    public function test_start_time_attack_mode(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'time_attack',
        ]);

        $response->assertOk();
        $response->assertJson([
            'mode' => 'time_attack',
            'total_rounds' => 5,
            'round_timeout' => 15,
        ]);
    }

    public function test_start_perfect_score_mode(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'perfect_score',
        ]);

        $response->assertOk();
        $response->assertJson([
            'mode' => 'perfect_score',
            'total_rounds' => 10,
            'round_timeout' => 120,
        ]);
    }

    public function test_start_rejects_invalid_mode(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'invalid_mode',
        ]);

        $response->assertUnprocessable();
    }

    public function test_start_rejects_duplicate_in_progress(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $this->postJson("/players/{$player->getKey()}/solo/start", ['mode' => 'explorer']);

        $response = $this->postJson("/players/{$player->getKey()}/solo/start", ['mode' => 'explorer']);
        $response->assertUnprocessable();
        $response->assertJson(['error' => 'You already have a solo game in progress']);
    }

    public function test_start_uses_default_map_when_none_specified(): void
    {
        $map = $this->setupMap(50);
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/solo/start", ['mode' => 'explorer']);

        $response->assertOk();
        $game = SoloGame::first();
        $this->assertEquals($map->getKey(), $game->map_id);
    }

    // ─── GUESS TESTS ───

    public function test_guess_calculates_score(): void
    {
        $map = $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);

        $gameId = $startRes->json('game_id');
        $location = $startRes->json('location');

        // Guess at the exact location for a perfect score
        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => $location['lat'],
            'lng' => $location['lng'],
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'score', 'speed_bonus', 'total_score', 'distance_km',
            'timed_out', 'rounds_completed', 'game_over', 'location',
        ]);
        $this->assertEquals(5000, $response->json('score'));
        $this->assertFalse($response->json('timed_out'));
        $this->assertEquals(1, $response->json('rounds_completed'));
    }

    public function test_guess_returns_distance(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);

        $gameId = $startRes->json('game_id');

        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => 0,
            'lng' => 0,
        ]);

        $response->assertOk();
        $this->assertIsFloat($response->json('distance_km'));
    }

    public function test_guess_advances_round(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);

        $gameId = $startRes->json('game_id');

        $res1 = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => 0, 'lng' => 0,
        ]);
        $this->assertEquals(1, $res1->json('rounds_completed'));
        $this->assertFalse($res1->json('game_over'));
        $this->assertNotNull($res1->json('next_location'));

        $res2 = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => 0, 'lng' => 0,
        ]);
        $this->assertEquals(2, $res2->json('rounds_completed'));
    }

    public function test_guess_reveals_actual_location(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);

        $gameId = $startRes->json('game_id');
        $location = $startRes->json('location');

        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => 0, 'lng' => 0,
        ]);

        $this->assertEquals($location['lat'], $response->json('location.lat'));
        $this->assertEquals($location['lng'], $response->json('location.lng'));
    }

    public function test_guess_updates_round_scores_json(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);

        $gameId = $startRes->json('game_id');

        $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => 0, 'lng' => 0,
        ]);

        $game = SoloGame::find($gameId);
        $this->assertCount(1, $game->round_scores);
        $this->assertEquals(1, $game->round_scores[0]['round']);
        $this->assertArrayHasKey('score', $game->round_scores[0]);
        $this->assertArrayHasKey('distance_km', $game->round_scores[0]);
    }

    // ─── TIMER TESTS ───

    public function test_guess_scores_zero_when_timed_out(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'time_attack',
        ]);

        $gameId = $startRes->json('game_id');
        $location = $startRes->json('location');

        // Move time forward past the 15s timeout
        Carbon::setTestNow(now()->addSeconds(20));

        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => $location['lat'],
            'lng' => $location['lng'],
        ]);

        $response->assertOk();
        $this->assertEquals(0, $response->json('score'));
        $this->assertTrue($response->json('timed_out'));

        Carbon::setTestNow();
    }

    public function test_guess_scores_normally_within_time(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'time_attack',
        ]);

        $gameId = $startRes->json('game_id');
        $location = $startRes->json('location');

        // Move time forward just 5 seconds (within 15s timeout)
        Carbon::setTestNow(now()->addSeconds(5));

        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => $location['lat'],
            'lng' => $location['lng'],
        ]);

        $response->assertOk();
        $this->assertEquals(5000, $response->json('score'));
        $this->assertFalse($response->json('timed_out'));

        Carbon::setTestNow();
    }

    public function test_explorer_no_timer_never_times_out(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
            'round_timeout' => 0,
        ]);

        $gameId = $startRes->json('game_id');
        $location = $startRes->json('location');

        Carbon::setTestNow(now()->addMinutes(30));

        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => $location['lat'],
            'lng' => $location['lng'],
        ]);

        $this->assertEquals(5000, $response->json('score'));
        $this->assertFalse($response->json('timed_out'));

        Carbon::setTestNow();
    }

    // ─── STREAK TESTS ───

    public function test_streak_damage_equals_max_health_minus_score(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'streak',
            'difficulty' => 'normal',
        ]);

        $gameId = $startRes->json('game_id');
        $location = $startRes->json('location');

        // Perfect guess: score 5000, damage 0
        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => $location['lat'],
            'lng' => $location['lng'],
        ]);

        $this->assertEquals(5000, $response->json('score'));
        $this->assertEquals(0, $response->json('damage'));
        $this->assertEquals(5000, $response->json('health'));
    }

    public function test_streak_hp_decreases(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'streak',
            'difficulty' => 'normal',
        ]);

        $gameId = $startRes->json('game_id');

        // Bad guess far away — score will be low, damage high
        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => 89.99, 'lng' => 179.99,
        ]);

        $this->assertLessThan(5000, $response->json('health'));
        $this->assertGreaterThan(0, $response->json('damage'));
    }

    public function test_streak_game_over_when_hp_reaches_zero(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'streak',
            'difficulty' => 'hardcore', // 2500 HP
        ]);

        $gameId = $startRes->json('game_id');

        // Keep making bad guesses until game over
        $gameOver = false;
        for ($i = 0; $i < 20 && ! $gameOver; $i++) {
            $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 89.99, 'lng' => 179.99,
            ]);
            $gameOver = $response->json('game_over');
        }

        $this->assertTrue($gameOver);
        $this->assertEquals(0, $response->json('health'));

        $game = SoloGame::find($gameId);
        $this->assertEquals('completed', $game->status);
    }

    public function test_streak_hp_does_not_go_negative(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'streak',
            'difficulty' => 'hardcore',
        ]);

        $gameId = $startRes->json('game_id');

        // Keep guessing until game over
        for ($i = 0; $i < 20; $i++) {
            $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 89.99, 'lng' => 179.99,
            ]);
            if ($response->json('game_over')) {
                break;
            }
        }

        $this->assertGreaterThanOrEqual(0, $response->json('health'));
    }

    // ─── TIME ATTACK TESTS ───

    public function test_time_attack_includes_speed_bonus(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'time_attack',
        ]);

        $gameId = $startRes->json('game_id');
        $location = $startRes->json('location');

        // Fast guess (5 seconds in)
        Carbon::setTestNow(now()->addSeconds(5));

        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => $location['lat'],
            'lng' => $location['lng'],
        ]);

        $this->assertGreaterThan(0, $response->json('speed_bonus'));
        $this->assertEquals(
            $response->json('score') + $response->json('speed_bonus'),
            $response->json('total_score'),
        );

        Carbon::setTestNow();
    }

    public function test_time_attack_completes_after_5_rounds(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'time_attack',
        ]);

        $gameId = $startRes->json('game_id');

        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 0, 'lng' => 0,
            ]);
        }

        $this->assertTrue($response->json('game_over'));
        $this->assertEquals(5, $response->json('rounds_completed'));
    }

    // ─── PERFECT SCORE TESTS ───

    public function test_perfect_score_tier_gold(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'perfect_score',
        ]);

        $gameId = $startRes->json('game_id');

        // Make all 10 guesses at exact locations (score 5000 each = 50000 total)
        for ($i = 0; $i < 10; $i++) {
            $game = SoloGame::find($gameId);
            $locId = $game->location_ids[$game->current_location_index];
            $loc = Location::find($locId);

            $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => $loc->lat,
                'lng' => $loc->lng,
            ]);
        }

        $this->assertTrue($response->json('game_over'));
        $this->assertEquals('gold', $response->json('tier'));
    }

    public function test_perfect_score_tier_silver(): void
    {
        $service = app(SoloGameService::class);
        $this->assertEquals('silver', $service->calculateTier(35000));
        $this->assertEquals('silver', $service->calculateTier(30000));
    }

    public function test_perfect_score_tier_bronze(): void
    {
        $service = app(SoloGameService::class);
        $this->assertEquals('bronze', $service->calculateTier(20000));
        $this->assertEquals('bronze', $service->calculateTier(0));
    }

    // ─── COMPLETION TESTS ───

    public function test_completion_sets_status_and_timestamp(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'time_attack',
        ]);

        $gameId = $startRes->json('game_id');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 0, 'lng' => 0,
            ]);
        }

        $game = SoloGame::find($gameId);
        $this->assertEquals('completed', $game->status);
        $this->assertNotNull($game->completed_at);
    }

    public function test_completion_creates_personal_best(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'time_attack',
        ]);

        $gameId = $startRes->json('game_id');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 0, 'lng' => 0,
            ]);
        }

        $pb = SoloPersonalBest::where('player_id', $player->getKey())
            ->where('mode', 'time_attack')
            ->first();

        $this->assertNotNull($pb);
        $this->assertGreaterThan(0, $pb->best_score);
    }

    public function test_personal_best_updated_when_beaten(): void
    {
        $map = $this->setupMap(50);
        $player = Player::factory()->create();

        // First game — bad scores
        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);
        $gameId = $startRes->json('game_id');
        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 89.99, 'lng' => 179.99,
            ]);
        }

        $pb = SoloPersonalBest::where('player_id', $player->getKey())
            ->where('mode', 'explorer')
            ->first();
        $oldScore = $pb->best_score;

        // Second game — perfect scores
        $startRes2 = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);
        $gameId2 = $startRes2->json('game_id');
        for ($i = 0; $i < 5; $i++) {
            $game = SoloGame::find($gameId2);
            $locId = $game->location_ids[$game->current_location_index];
            $loc = Location::find($locId);
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId2}/guess", [
                'lat' => $loc->lat, 'lng' => $loc->lng,
            ]);
        }

        $pb->refresh();
        $this->assertGreaterThan($oldScore, $pb->best_score);
    }

    public function test_personal_best_preserved_when_not_beaten(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        // First game — perfect scores
        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);
        $gameId = $startRes->json('game_id');
        for ($i = 0; $i < 5; $i++) {
            $game = SoloGame::find($gameId);
            $locId = $game->location_ids[$game->current_location_index];
            $loc = Location::find($locId);
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => $loc->lat, 'lng' => $loc->lng,
            ]);
        }

        $pb = SoloPersonalBest::where('player_id', $player->getKey())
            ->where('mode', 'explorer')
            ->first();
        $bestScore = $pb->best_score;

        // Second game — bad scores
        $startRes2 = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);
        $gameId2 = $startRes2->json('game_id');
        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId2}/guess", [
                'lat' => 89.99, 'lng' => 179.99,
            ]);
        }

        $pb->refresh();
        $this->assertEquals($bestScore, $pb->best_score);
    }

    // ─── PLAYER STATS TESTS ───

    public function test_completion_increments_solo_games_played(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);
        $gameId = $startRes->json('game_id');
        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 0, 'lng' => 0,
            ]);
        }

        $stats = PlayerStats::where('player_id', $player->getKey())->first();
        $this->assertEquals(1, $stats->solo_games_played);
        $this->assertEquals(5, $stats->solo_rounds_played);
    }

    public function test_completion_updates_best_round_score(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);
        $gameId = $startRes->json('game_id');

        // Get first location for a perfect guess
        $game = SoloGame::find($gameId);
        $locId = $game->location_ids[0];
        $loc = Location::find($locId);

        $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => $loc->lat, 'lng' => $loc->lng,
        ]);

        // Complete remaining rounds
        for ($i = 0; $i < 4; $i++) {
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 0, 'lng' => 0,
            ]);
        }

        $stats = PlayerStats::where('player_id', $player->getKey())->first();
        $this->assertEquals(5000, $stats->solo_best_round_score);
    }

    public function test_perfect_round_increments_counter(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);
        $gameId = $startRes->json('game_id');

        // Perfect first guess
        $game = SoloGame::find($gameId);
        $locId = $game->location_ids[0];
        $loc = Location::find($locId);
        $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => $loc->lat, 'lng' => $loc->lng,
        ]);

        // Complete remaining with bad guesses
        for ($i = 0; $i < 4; $i++) {
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 89.99, 'lng' => 179.99,
            ]);
        }

        $stats = PlayerStats::where('player_id', $player->getKey())->first();
        $this->assertGreaterThanOrEqual(1, $stats->solo_perfect_rounds);
    }

    public function test_streak_updates_best_streak_stat(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'streak',
            'difficulty' => 'hardcore',
        ]);
        $gameId = $startRes->json('game_id');

        // Play until game over
        for ($i = 0; $i < 20; $i++) {
            $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 89.99, 'lng' => 179.99,
            ]);
            if ($response->json('game_over')) {
                break;
            }
        }

        $game = SoloGame::find($gameId);
        $stats = PlayerStats::where('player_id', $player->getKey())->first();
        $this->assertEquals($game->rounds_completed, $stats->solo_best_streak);
    }

    // ─── ACHIEVEMENT TESTS ───

    public function test_solo_first_game_achievement(): void
    {
        $this->setupMap(50);
        $this->setupSoloAchievements();
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);
        $gameId = $startRes->json('game_id');
        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 0, 'lng' => 0,
            ]);
        }

        $achievement = Achievement::where('key', 'solo_first_game')->first();
        $this->assertDatabaseHas('player_achievements', [
            'player_id' => $player->getKey(),
            'achievement_id' => $achievement->getKey(),
        ]);
    }

    public function test_solo_streak_10_achievement(): void
    {
        $this->setupMap(50);
        $this->setupSoloAchievements();
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'streak',
            'difficulty' => 'casual', // 10000 HP for longer survival
        ]);
        $gameId = $startRes->json('game_id');

        // Make 10 perfect guesses, then die
        for ($i = 0; $i < 10; $i++) {
            $game = SoloGame::find($gameId);
            $locId = $game->location_ids[$game->current_location_index];
            $loc = Location::find($locId);
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => $loc->lat, 'lng' => $loc->lng,
            ]);
        }

        // Now die on purpose
        for ($i = 0; $i < 20; $i++) {
            $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 89.99, 'lng' => 179.99,
            ]);
            if ($response->json('game_over')) {
                break;
            }
        }

        $achievement = Achievement::where('key', 'solo_streak_10')->first();
        $this->assertDatabaseHas('player_achievements', [
            'player_id' => $player->getKey(),
            'achievement_id' => $achievement->getKey(),
        ]);
    }

    public function test_solo_perfect_round_achievement(): void
    {
        $this->setupMap(50);
        $this->setupSoloAchievements();
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);
        $gameId = $startRes->json('game_id');

        // One perfect guess
        $game = SoloGame::find($gameId);
        $locId = $game->location_ids[0];
        $loc = Location::find($locId);
        $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => $loc->lat, 'lng' => $loc->lng,
        ]);

        // Complete remaining
        for ($i = 0; $i < 4; $i++) {
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 0, 'lng' => 0,
            ]);
        }

        $achievement = Achievement::where('key', 'solo_perfect_round')->first();
        $this->assertDatabaseHas('player_achievements', [
            'player_id' => $player->getKey(),
            'achievement_id' => $achievement->getKey(),
        ]);
    }

    public function test_solo_perfectionist_achievement(): void
    {
        $this->setupMap(50);
        $this->setupSoloAchievements();
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'perfect_score',
        ]);
        $gameId = $startRes->json('game_id');

        // All perfect guesses (50000 = gold)
        for ($i = 0; $i < 10; $i++) {
            $game = SoloGame::find($gameId);
            $locId = $game->location_ids[$game->current_location_index];
            $loc = Location::find($locId);
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => $loc->lat, 'lng' => $loc->lng,
            ]);
        }

        $achievement = Achievement::where('key', 'solo_perfectionist')->first();
        $this->assertDatabaseHas('player_achievements', [
            'player_id' => $player->getKey(),
            'achievement_id' => $achievement->getKey(),
        ]);
    }

    // ─── ABANDON TESTS ───

    public function test_abandon_sets_status(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 10,
        ]);
        $gameId = $startRes->json('game_id');

        // Play a few rounds
        $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => 0, 'lng' => 0,
        ]);

        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/abandon");
        $response->assertOk();
        $response->assertJson(['abandoned' => true]);

        $game = SoloGame::find($gameId);
        $this->assertEquals('abandoned', $game->status);
        $this->assertNotNull($game->completed_at);
    }

    public function test_abandon_still_updates_stats(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 10,
        ]);
        $gameId = $startRes->json('game_id');

        $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => 0, 'lng' => 0,
        ]);

        $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/abandon");

        $stats = PlayerStats::where('player_id', $player->getKey())->first();
        $this->assertEquals(1, $stats->solo_games_played);
        $this->assertEquals(1, $stats->solo_rounds_played);
    }

    // ─── LEADERBOARD TESTS ───

    public function test_leaderboard_returns_top_entries(): void
    {
        $map = $this->setupMap(50);
        $player1 = Player::factory()->create();
        $player2 = Player::factory()->create();

        SoloGame::create([
            'player_id' => $player1->getKey(),
            'map_id' => $map->getKey(),
            'mode' => 'time_attack',
            'status' => 'completed',
            'total_score' => 20000,
            'rounds_completed' => 5,
            'round_scores' => [],
            'location_ids' => [],
            'completed_at' => now(),
        ]);

        SoloGame::create([
            'player_id' => $player2->getKey(),
            'map_id' => $map->getKey(),
            'mode' => 'time_attack',
            'status' => 'completed',
            'total_score' => 25000,
            'rounds_completed' => 5,
            'round_scores' => [],
            'location_ids' => [],
            'completed_at' => now(),
        ]);

        $response = $this->getJson('/solo/leaderboard?mode=time_attack');
        $response->assertOk();
        $response->assertJson(['mode' => 'time_attack']);
        $entries = $response->json('entries');
        $this->assertCount(2, $entries);
        $this->assertEquals(25000, $entries[0]['total_score']); // Higher score first
    }

    public function test_leaderboard_filters_by_map(): void
    {
        $map1 = $this->setupMap(50);
        $map2 = Map::factory()->create(['name' => 'other-map']);
        Location::factory()->for($map2)->count(10)->create();

        $player = Player::factory()->create();

        SoloGame::create([
            'player_id' => $player->getKey(),
            'map_id' => $map1->getKey(),
            'mode' => 'explorer',
            'status' => 'completed',
            'total_score' => 15000,
            'rounds_completed' => 5,
            'round_scores' => [],
            'location_ids' => [],
            'completed_at' => now(),
        ]);

        SoloGame::create([
            'player_id' => $player->getKey(),
            'map_id' => $map2->getKey(),
            'mode' => 'explorer',
            'status' => 'completed',
            'total_score' => 20000,
            'rounds_completed' => 5,
            'round_scores' => [],
            'location_ids' => [],
            'completed_at' => now(),
        ]);

        $response = $this->getJson("/solo/leaderboard?mode=explorer&map_id={$map1->getKey()}");
        $entries = $response->json('entries');
        $this->assertCount(1, $entries);
        $this->assertEquals(15000, $entries[0]['total_score']);
    }

    // ─── PERSONAL BESTS ───

    public function test_personal_bests_returns_grouped_by_mode(): void
    {
        $map = $this->setupMap(50);
        $player = Player::factory()->create();

        SoloPersonalBest::create([
            'player_id' => $player->getKey(),
            'map_id' => $map->getKey(),
            'mode' => 'time_attack',
            'best_score' => 25000,
            'best_rounds' => 5,
            'best_time_seconds' => 45,
        ]);

        SoloPersonalBest::create([
            'player_id' => $player->getKey(),
            'map_id' => $map->getKey(),
            'mode' => 'streak',
            'best_score' => 80000,
            'best_rounds' => 20,
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/solo/personal-bests");
        $response->assertOk();
        $data = $response->json();
        $this->assertArrayHasKey('time_attack', $data);
        $this->assertArrayHasKey('streak', $data);
        $this->assertEquals(25000, $data['time_attack'][0]['best_score']);
    }

    // ─── STATS ───

    public function test_stats_returns_solo_stats(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();
        PlayerStats::create([
            'player_id' => $player->getKey(),
            'solo_games_played' => 10,
            'solo_rounds_played' => 50,
            'solo_total_score' => 200000,
            'solo_best_round_score' => 5000,
            'solo_perfect_rounds' => 5,
            'solo_best_streak' => 15,
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/solo/stats");
        $response->assertOk();
        $response->assertJson([
            'solo_games_played' => 10,
            'solo_rounds_played' => 50,
            'solo_total_score' => 200000,
            'solo_best_round_score' => 5000,
            'solo_perfect_rounds' => 5,
            'solo_best_streak' => 15,
        ]);
    }

    // ─── OWNERSHIP/AUTH TESTS ───

    public function test_cannot_guess_on_another_players_game(): void
    {
        $this->setupMap(50);
        $player1 = Player::factory()->create();
        $player2 = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player1->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 5,
        ]);
        $gameId = $startRes->json('game_id');

        $response = $this->postJson("/players/{$player2->getKey()}/solo/{$gameId}/guess", [
            'lat' => 0, 'lng' => 0,
        ]);

        $response->assertForbidden();
    }

    public function test_cannot_guess_on_completed_game(): void
    {
        $this->setupMap(50);
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'time_attack',
        ]);
        $gameId = $startRes->json('game_id');

        // Complete the game
        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 0, 'lng' => 0,
            ]);
        }

        // Try to guess again
        $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
            'lat' => 0, 'lng' => 0,
        ]);

        $response->assertUnprocessable();
    }

    // ─── EXPLORER UNLIMITED ───

    public function test_explorer_unlimited_refills_locations(): void
    {
        $this->setupMap(100); // Need many locations
        $player = Player::factory()->create();

        $startRes = $this->postJson("/players/{$player->getKey()}/solo/start", [
            'mode' => 'explorer',
            'max_rounds' => 0, // unlimited
        ]);
        $gameId = $startRes->json('game_id');

        $game = SoloGame::find($gameId);
        $initialCount = count($game->location_ids);

        // Play through enough rounds to trigger refill
        for ($i = 0; $i < $initialCount; $i++) {
            $response = $this->postJson("/players/{$player->getKey()}/solo/{$gameId}/guess", [
                'lat' => 0, 'lng' => 0,
            ]);
            if ($response->json('game_over')) {
                break;
            }
        }

        $game->refresh();
        $this->assertGreaterThan($initialCount, count($game->location_ids));
    }
}
