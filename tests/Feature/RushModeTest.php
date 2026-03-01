<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Round;
use App\Services\GameCompletionService;
use App\Services\HealthService;
use App\Services\ScoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class RushModeTest extends TestCase
{
    use RefreshDatabase;

    // --- Game model ---

    public function test_rush_game_is_rush(): void
    {
        $game = Game::factory()->rush()->create();

        $this->assertTrue($game->isRush());
        $this->assertFalse($game->isClassic());
        $this->assertFalse($game->isBestOfN());
    }

    public function test_rush_uses_shorter_timeout(): void
    {
        $game = Game::factory()->rush()->create();

        $this->assertSame(config('game.rush_round_timeout_seconds'), $game->roundTimeoutSeconds());
    }

    public function test_classic_uses_standard_timeout(): void
    {
        $game = Game::factory()->create();

        $this->assertSame(config('game.round_timeout_seconds'), $game->roundTimeoutSeconds());
    }

    public function test_rush_has_max_rounds(): void
    {
        $game = Game::factory()->rush()->create();

        $this->assertSame(config('game.rush_max_rounds'), $game->max_rounds);
    }

    // --- Speed bonus scoring ---

    public function test_speed_bonus_max_at_zero_seconds(): void
    {
        $bonus = ScoringService::calculateSpeedBonus(0, 15);

        $this->assertSame(config('game.rush_speed_bonus_max'), $bonus);
    }

    public function test_speed_bonus_zero_at_timeout(): void
    {
        $bonus = ScoringService::calculateSpeedBonus(15, 15);

        $this->assertSame(0, $bonus);
    }

    public function test_speed_bonus_half_at_midpoint(): void
    {
        $bonus = ScoringService::calculateSpeedBonus(7, 14);

        $this->assertSame((int) round(config('game.rush_speed_bonus_max') * 0.5), $bonus);
    }

    // --- HealthService for rush (same as classic) ---

    public function test_rush_deducts_health_like_classic(): void
    {
        $game = Game::factory()->rush()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);
        $round = Round::factory()->for($game)->create([
            'player_one_score' => 4000,
            'player_two_score' => 2000,
        ]);

        app(HealthService::class)->deductHealth($game, $round);

        $game->refresh();
        $this->assertSame(5000, $game->player_one_health);
        $this->assertSame(3000, $game->player_two_health);
    }

    // --- GameCompletionService for rush ---

    public function test_rush_completes_at_max_rounds_by_score(): void
    {
        Event::fake();
        $maxRounds = config('game.rush_max_rounds');
        $game = Game::factory()->rush()->inProgress()->create();

        // Create all rounds
        for ($i = 1; $i <= $maxRounds; $i++) {
            Round::factory()->for($game)->create([
                'round_number' => $i,
                'player_one_score' => 4000,
                'player_two_score' => 3000,
            ]);
        }

        $lastRound = $game->rounds()->orderByDesc('round_number')->first();
        $completed = app(GameCompletionService::class)->checkAndComplete($game, $lastRound);

        $this->assertTrue($completed);
        $game->refresh();
        $this->assertSame(GameStatus::Completed, $game->status);
        $this->assertSame($game->player_one_id, $game->winner_id);
    }

    public function test_rush_does_not_complete_before_max_rounds(): void
    {
        $game = Game::factory()->rush()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);
        $round = Round::factory()->for($game)->create([
            'round_number' => 1,
            'player_one_score' => 4000,
            'player_two_score' => 3000,
        ]);

        $completed = app(GameCompletionService::class)->checkAndComplete($game, $round);

        $this->assertFalse($completed);
    }

    public function test_rush_draw_when_scores_equal(): void
    {
        Event::fake();
        $maxRounds = config('game.rush_max_rounds');
        $game = Game::factory()->rush()->inProgress()->create();

        for ($i = 1; $i <= $maxRounds; $i++) {
            Round::factory()->for($game)->create([
                'round_number' => $i,
                'player_one_score' => 3000,
                'player_two_score' => 3000,
            ]);
        }

        $lastRound = $game->rounds()->orderByDesc('round_number')->first();
        $completed = app(GameCompletionService::class)->checkAndComplete($game, $lastRound);

        $this->assertTrue($completed);
        $game->refresh();
        $this->assertNull($game->winner_id);
    }
}
