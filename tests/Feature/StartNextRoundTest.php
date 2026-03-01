<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Events\GameFinished;
use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Listeners\StartNextRound;
use App\Models\Game;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class StartNextRoundTest extends TestCase
{
    use RefreshDatabase;

    private function handle(Round $round): void
    {
        Bus::fake();
        (new StartNextRound)->handle(new RoundFinished($round));
    }

    private function roundFor(Game $game, int $p1Score, int $p2Score, int $roundNumber = 1): Round
    {
        return Round::factory()->for($game)->create([
            'round_number' => $roundNumber,
            'player_one_score' => $p1Score,
            'player_two_score' => $p2Score,
        ]);
    }

    // --- Health deduction ---

    public function test_player_two_takes_damage_when_player_one_scores_higher(): void
    {
        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 4000, 1000));

        $game->refresh();
        $this->assertSame(5000, $game->player_one_health);
        $this->assertSame(2000, $game->player_two_health); // 5000 - (4000 - 1000)
    }

    public function test_player_one_takes_damage_when_player_two_scores_higher(): void
    {
        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 1000, 4000));

        $game->refresh();
        $this->assertSame(2000, $game->player_one_health); // 5000 - (4000 - 1000)
        $this->assertSame(5000, $game->player_two_health);
    }

    public function test_no_damage_is_dealt_when_scores_are_equal(): void
    {
        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 3000, 3000));

        $game->refresh();
        $this->assertSame(5000, $game->player_one_health);
        $this->assertSame(5000, $game->player_two_health);
    }

    public function test_damage_equals_absolute_score_difference(): void
    {
        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 5000, 0));

        $game->refresh();
        $this->assertSame(0, $game->player_two_health);
    }

    public function test_health_can_go_negative(): void
    {
        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 50,
        ]);

        $this->handle($this->roundFor($game, 500, 50));

        $game->refresh();
        $this->assertSame(-400, $game->player_two_health); // 50 - (500 - 50) = 50 - 450 = -400
    }

    public function test_null_scores_are_treated_as_zero(): void
    {
        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $round = Round::factory()->for($game)->create([
            'round_number' => 1,
            'player_one_score' => null,
            'player_two_score' => null,
        ]);

        $this->handle($round);

        $game->refresh();
        $this->assertSame(5000, $game->player_one_health);
        $this->assertSame(5000, $game->player_two_health);
    }

    // --- Next round creation ---

    public function test_next_round_is_created_when_both_players_have_health(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 3000, 2000, roundNumber: 1));

        $this->assertDatabaseHas('rounds', [
            'game_id' => $game->getKey(),
            'round_number' => 2,
        ]);
    }

    public function test_round_started_event_is_dispatched_with_updated_health(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 4000, 1000, roundNumber: 1));

        Event::assertDispatched(RoundStarted::class, function (RoundStarted $event) use ($game) {
            return $event->round->game_id === $game->getKey()
                && $event->round->round_number === 2
                && $event->playerOneHealth === 5000
                && $event->playerTwoHealth === 2000;
        });
    }

    public function test_force_end_round_is_scheduled_sixty_seconds_after_round_start(): void
    {
        Bus::fake();
        $now = now();
        Date::setTestNow($now);

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 4000, 1000, roundNumber: 1));

        $expected = $now->addSeconds(60);
        Bus::assertDispatched(ForceEndRound::class, function (ForceEndRound $job) use ($expected) {
            return $job->delay instanceof \DateTimeInterface
                && $job->delay->getTimestamp() === $expected->getTimestamp();
        });

        Date::setTestNow();
    }

    public function test_game_finishes_after_three_no_guess_rounds(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
            'no_guess_rounds' => 2,
        ]);

        $round = Round::factory()->for($game)->create([
            'round_number' => 1,
            'player_one_guess_lat' => null,
            'player_one_guess_lng' => null,
            'player_two_guess_lat' => null,
            'player_two_guess_lng' => null,
        ]);

        $this->handle($round);

        Event::assertDispatched(GameFinished::class, fn (GameFinished $e) => $e->game->getKey() === $game->getKey());
        Event::assertNotDispatched(RoundStarted::class);
        $this->assertSame(3, $game->fresh()->no_guess_rounds);
        $this->assertSame(GameStatus::Completed, $game->fresh()->status);
    }

    // --- Game over ---

    public function test_game_finished_event_is_dispatched_when_player_health_reaches_zero(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 5000, 0));

        Event::assertDispatched(GameFinished::class, fn (GameFinished $e) => $e->game->getKey() === $game->getKey());
    }

    public function test_no_new_round_is_created_when_game_is_over(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 5000, 0, roundNumber: 1));

        Event::assertNotDispatched(RoundStarted::class);
        $this->assertDatabaseMissing('rounds', [
            'game_id' => $game->getKey(),
            'round_number' => 2,
        ]);
    }

    public function test_game_is_marked_completed_when_a_player_dies(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 5000, 0));

        $this->assertSame(GameStatus::Completed, $game->fresh()->status);
    }

    public function test_player_one_is_winner_when_player_two_dies(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 5000, 0));

        $this->assertSame($game->player_one_id, $game->fresh()->winner_id);
    }

    public function test_player_two_is_winner_when_player_one_dies(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $this->handle($this->roundFor($game, 0, 5000));

        $this->assertSame($game->player_two_id, $game->fresh()->winner_id);
    }

    public function test_game_finishes_when_health_drops_to_zero_mid_game(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 1000,
        ]);

        $this->handle($this->roundFor($game, 4000, 0));

        Event::assertDispatched(GameFinished::class);
        $this->assertSame(-3000, $game->fresh()->player_two_health); // 1000 - 4000
    }

    // --- ELO updates ---

    public function test_winner_elo_increases_and_loser_elo_decreases(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $game->playerOne->update(['elo_rating' => 1000]);
        $game->playerTwo->update(['elo_rating' => 1000]);

        $this->handle($this->roundFor($game, 5000, 0));

        // Equal ratings: expected = 0.5, K=32, winner gets +16, loser gets -16
        $this->assertSame(1016, $game->playerOne->fresh()->elo_rating);
        $this->assertSame(984, $game->playerTwo->fresh()->elo_rating);
    }

    public function test_elo_change_is_smaller_when_higher_rated_player_wins(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $game->playerOne->update(['elo_rating' => 1400]);
        $game->playerTwo->update(['elo_rating' => 1000]);

        $this->handle($this->roundFor($game, 5000, 0));

        $p1Elo = $game->playerOne->fresh()->elo_rating;
        $p2Elo = $game->playerTwo->fresh()->elo_rating;

        // Higher rated player winning should gain less than 16
        $this->assertLessThan(16, $p1Elo - 1400);
        $this->assertGreaterThan(0, $p1Elo - 1400);
        // Lower rated player losing should lose less than 16
        $this->assertGreaterThan(-16, $p2Elo - 1000);
        $this->assertLessThan(0, $p2Elo - 1000);
    }

    public function test_elo_change_is_larger_when_lower_rated_player_wins(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $game->playerOne->update(['elo_rating' => 1000]);
        $game->playerTwo->update(['elo_rating' => 1400]);

        $this->handle($this->roundFor($game, 5000, 0));

        $p1Elo = $game->playerOne->fresh()->elo_rating;
        $p2Elo = $game->playerTwo->fresh()->elo_rating;

        // Lower rated player winning should gain more than 16
        $this->assertGreaterThan(16, $p1Elo - 1000);
        // Higher rated player losing should lose more than 16
        $this->assertLessThan(-16, $p2Elo - 1400);
    }

    public function test_draw_adjusts_elo_toward_opponent(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
            'no_guess_rounds' => 2,
        ]);

        $game->playerOne->update(['elo_rating' => 1200]);
        $game->playerTwo->update(['elo_rating' => 1000]);

        $round = Round::factory()->for($game)->create([
            'round_number' => 1,
            'player_one_guess_lat' => null,
            'player_one_guess_lng' => null,
            'player_two_guess_lat' => null,
            'player_two_guess_lng' => null,
        ]);

        $this->handle($round);

        $p1Elo = $game->playerOne->fresh()->elo_rating;
        $p2Elo = $game->playerTwo->fresh()->elo_rating;

        // Higher-rated player should lose elo in a draw
        $this->assertLessThan(1200, $p1Elo);
        // Lower-rated player should gain elo in a draw
        $this->assertGreaterThan(1000, $p2Elo);
    }

    public function test_elo_is_unchanged_when_game_continues(): void
    {
        Event::fake();

        $game = Game::factory()->inProgress()->create([
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ]);

        $game->playerOne->update(['elo_rating' => 1000]);
        $game->playerTwo->update(['elo_rating' => 1000]);

        $this->handle($this->roundFor($game, 3000, 2000));

        $this->assertSame(1000, $game->playerOne->fresh()->elo_rating);
        $this->assertSame(1000, $game->playerTwo->fresh()->elo_rating);
    }
}
