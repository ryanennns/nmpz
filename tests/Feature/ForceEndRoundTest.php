<?php

namespace Tests\Feature;

use App\Events\RoundFinished;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ForceEndRoundTest extends TestCase
{
    use RefreshDatabase;

    public function test_round_finished_is_dispatched_when_only_one_player_has_guessed(): void
    {
        Event::fake();
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_guess_lat' => 48.8566,
            'player_one_guess_lng' => 2.3522,
            'player_one_locked_in' => true,
        ]);

        (new ForceEndRound($round->getKey()))->handle();

        Event::assertDispatched(RoundFinished::class, fn (RoundFinished $e) => $e->round->getKey() === $round->getKey());
    }

    public function test_round_finished_is_dispatched_when_neither_player_has_guessed(): void
    {
        Event::fake();
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create();

        (new ForceEndRound($round->getKey()))->handle();

        Event::assertDispatched(RoundFinished::class, fn (RoundFinished $e) => $e->round->getKey() === $round->getKey());
    }

    public function test_scores_are_evaluated_for_the_player_who_guessed(): void
    {
        Event::fake();
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_guess_lat' => 48.8566,
            'player_one_guess_lng' => 2.3522,
            'player_one_locked_in' => true,
        ]);

        (new ForceEndRound($round->getKey()))->handle();

        $round->refresh();
        $this->assertNotNull($round->player_one_score);
        $this->assertNull($round->player_two_score);
    }

    public function test_does_nothing_if_round_already_finished(): void
    {
        Event::fake();
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'finished_at' => now(),
        ]);

        (new ForceEndRound($round->getKey()))->handle();

        Event::assertNotDispatched(RoundFinished::class);
    }

    public function test_does_nothing_if_both_players_already_guessed_and_round_was_finished(): void
    {
        Event::fake();
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_guess_lat' => 48.8566,
            'player_one_guess_lng' => 2.3522,
            'player_one_locked_in' => true,
            'player_two_guess_lat' => 51.5074,
            'player_two_guess_lng' => -0.1278,
            'player_two_locked_in' => true,
            'finished_at' => now(),
        ]);

        (new ForceEndRound($round->getKey()))->handle();

        Event::assertNotDispatched(RoundFinished::class);
    }
}
