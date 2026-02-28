<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Round;
use App\Services\GameCompletionService;
use App\Services\HealthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class BestOfNTest extends TestCase
{
    use RefreshDatabase;

    // --- Game model helpers ---

    public function test_classic_game_is_classic(): void
    {
        $game = Game::factory()->create();

        $this->assertTrue($game->isClassic());
        $this->assertFalse($game->isBestOfN());
    }

    public function test_bo3_game_is_best_of_n(): void
    {
        $game = Game::factory()->bestOfThree()->create();

        $this->assertTrue($game->isBestOfN());
        $this->assertFalse($game->isClassic());
        $this->assertSame(2, $game->winsNeeded());
    }

    public function test_bo5_wins_needed_is_3(): void
    {
        $game = Game::factory()->bestOfFive()->create();

        $this->assertTrue($game->isBestOfN());
        $this->assertSame(3, $game->winsNeeded());
    }

    public function test_bo7_wins_needed_is_4(): void
    {
        $game = Game::factory()->bestOfSeven()->create();

        $this->assertTrue($game->isBestOfN());
        $this->assertSame(4, $game->winsNeeded());
    }

    // --- HealthService bo-N ---

    public function test_bo3_records_round_win_for_p1(): void
    {
        $game = Game::factory()->bestOfThree()->inProgress()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_score' => 4000,
            'player_two_score' => 3000,
        ]);

        app(HealthService::class)->deductHealth($game, $round);

        $game->refresh();
        $this->assertSame(1, $game->player_one_wins);
        $this->assertSame(0, $game->player_two_wins);
    }

    public function test_bo3_records_round_win_for_p2(): void
    {
        $game = Game::factory()->bestOfThree()->inProgress()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_score' => 2000,
            'player_two_score' => 4000,
        ]);

        app(HealthService::class)->deductHealth($game, $round);

        $game->refresh();
        $this->assertSame(0, $game->player_one_wins);
        $this->assertSame(1, $game->player_two_wins);
    }

    public function test_bo3_tie_no_win_recorded(): void
    {
        $game = Game::factory()->bestOfThree()->inProgress()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_score' => 3000,
            'player_two_score' => 3000,
        ]);

        app(HealthService::class)->deductHealth($game, $round);

        $game->refresh();
        $this->assertSame(0, $game->player_one_wins);
        $this->assertSame(0, $game->player_two_wins);
    }

    public function test_bo3_does_not_deduct_health(): void
    {
        $game = Game::factory()->bestOfThree()->inProgress()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_score' => 4000,
            'player_two_score' => 2000,
        ]);

        app(HealthService::class)->deductHealth($game, $round);

        $game->refresh();
        $this->assertSame(0, $game->player_one_health);
        $this->assertSame(0, $game->player_two_health);
    }

    // --- GameCompletionService bo-N ---

    public function test_bo3_completes_when_p1_reaches_2_wins(): void
    {
        Event::fake();
        $game = Game::factory()->bestOfThree()->inProgress()->create([
            'player_one_wins' => 2,
            'player_two_wins' => 0,
        ]);
        $round = Round::factory()->for($game)->create(['round_number' => 2]);

        $completed = app(GameCompletionService::class)->checkAndComplete($game, $round);

        $this->assertTrue($completed);
        $game->refresh();
        $this->assertSame(GameStatus::Completed, $game->status);
        $this->assertSame($game->player_one_id, $game->winner_id);
    }

    public function test_bo3_completes_when_p2_reaches_2_wins(): void
    {
        Event::fake();
        $game = Game::factory()->bestOfThree()->inProgress()->create([
            'player_one_wins' => 0,
            'player_two_wins' => 2,
        ]);
        $round = Round::factory()->for($game)->create(['round_number' => 2]);

        $completed = app(GameCompletionService::class)->checkAndComplete($game, $round);

        $this->assertTrue($completed);
        $game->refresh();
        $this->assertSame(GameStatus::Completed, $game->status);
        $this->assertSame($game->player_two_id, $game->winner_id);
    }

    public function test_bo3_does_not_complete_before_wins_reached(): void
    {
        $game = Game::factory()->bestOfThree()->inProgress()->create([
            'player_one_wins' => 1,
            'player_two_wins' => 1,
        ]);
        $round = Round::factory()->for($game)->create(['round_number' => 2]);

        $completed = app(GameCompletionService::class)->checkAndComplete($game, $round);

        $this->assertFalse($completed);
        $game->refresh();
        $this->assertSame(GameStatus::InProgress, $game->status);
    }

    public function test_bo3_max_rounds_tiebreak(): void
    {
        Event::fake();
        $game = Game::factory()->bestOfThree()->inProgress()->create([
            'player_one_wins' => 2,
            'player_two_wins' => 1,
        ]);
        // Create all 3 rounds
        Round::factory()->for($game)->create(['round_number' => 1]);
        Round::factory()->for($game)->create(['round_number' => 2]);
        $round3 = Round::factory()->for($game)->create(['round_number' => 3]);

        $completed = app(GameCompletionService::class)->checkAndComplete($game, $round3);

        $this->assertTrue($completed);
        $game->refresh();
        $this->assertSame($game->player_one_id, $game->winner_id);
    }

    public function test_bo3_max_rounds_draw(): void
    {
        Event::fake();
        $game = Game::factory()->bestOfThree()->inProgress()->create([
            'player_one_wins' => 1,
            'player_two_wins' => 1,
        ]);
        // Create all 3 rounds so max_rounds is reached
        Round::factory()->for($game)->create(['round_number' => 1]);
        Round::factory()->for($game)->create(['round_number' => 2]);
        $round3 = Round::factory()->for($game)->create(['round_number' => 3]);

        $completed = app(GameCompletionService::class)->checkAndComplete($game, $round3);

        $this->assertTrue($completed);
        $game->refresh();
        $this->assertSame(GameStatus::Completed, $game->status);
        $this->assertNull($game->winner_id);
    }

    public function test_bo3_no_guess_forfeit(): void
    {
        Event::fake();
        $forfeitRounds = config('game.no_guess_forfeit_rounds');
        $game = Game::factory()->bestOfThree()->inProgress()->create([
            'no_guess_rounds' => $forfeitRounds - 1,
        ]);
        $round = Round::factory()->for($game)->create([
            'round_number' => $forfeitRounds,
            'player_one_guess_lat' => null,
            'player_one_guess_lng' => null,
            'player_two_guess_lat' => null,
            'player_two_guess_lng' => null,
        ]);

        $completed = app(GameCompletionService::class)->checkAndComplete($game, $round);

        $this->assertTrue($completed);
        $game->refresh();
        $this->assertSame(GameStatus::Completed, $game->status);
        $this->assertNull($game->winner_id);
    }
}
