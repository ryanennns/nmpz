<?php

namespace Tests\Feature;

use App\Events\PlayerGuessed;
use App\Events\RoundFinished;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class PlayerMakesGuessTest extends TestCase
{
    use RefreshDatabase;

    private function url(Player $player, Game $game, Round $round): string
    {
        return route('games.rounds.guess', [$player, $game, $round]);
    }

    private function validPayload(): array
    {
        return ['lat' => 48.8566, 'lng' => 2.3522];
    }

    private function lockedPayload(): array
    {
        return ['lat' => 48.8566, 'lng' => 2.3522, 'locked_in' => true];
    }

    private function makeScenario(string $playerSlot = 'player_one_id'): array
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create([$playerSlot => $player->getKey()]);
        $round = Round::factory()->for($game)->create();

        return [$player, $game, $round];
    }

    // --- Happy paths ---

    public function test_player_one_can_lock_in_a_guess(): void
    {
        Event::fake();
        [$player, $game, $round] = $this->makeScenario('player_one_id');

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload())
            ->assertOk();

        $this->assertDatabaseHas('rounds', [
            'id' => $round->getKey(),
            'player_one_guess_lat' => 48.8566,
            'player_one_guess_lng' => 2.3522,
            'player_one_locked_in' => true,
            'player_two_locked_in' => false,
        ]);
    }

    public function test_player_two_can_lock_in_a_guess(): void
    {
        Event::fake();
        [$player, $game, $round] = $this->makeScenario('player_two_id');

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload())
            ->assertOk();

        $this->assertDatabaseHas('rounds', [
            'id' => $round->getKey(),
            'player_two_guess_lat' => 48.8566,
            'player_two_guess_lng' => 2.3522,
            'player_one_locked_in' => false,
            'player_two_locked_in' => true,
        ]);
    }

    public function test_player_guessed_event_is_fired_on_lock_in(): void
    {
        Event::fake();
        [$player, $game, $round] = $this->makeScenario('player_one_id');

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload());

        Event::assertDispatched(PlayerGuessed::class, function (PlayerGuessed $event) use ($round, $player) {
            return $event->round->getKey() === $round->getKey()
                && $event->player->getKey() === $player->getKey();
        });
    }

    public function test_round_finished_event_is_fired_when_both_players_lock_in(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $round = Round::factory()->for($game)->create([
            'player_two_guess_lat' => 51.5074,
            'player_two_guess_lng' => -0.1278,
            'player_two_locked_in' => true,
        ]);

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload());

        Event::assertDispatched(RoundFinished::class, fn (RoundFinished $e) => $e->round->getKey() === $round->getKey());
    }

    public function test_round_finished_event_is_not_fired_when_only_one_player_has_locked_in(): void
    {
        Event::fake();
        Bus::fake();
        [$player, $game, $round] = $this->makeScenario('player_one_id');

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload());

        Event::assertNotDispatched(RoundFinished::class);
    }

    public function test_force_end_round_job_is_dispatched_when_only_one_player_has_locked_in(): void
    {
        Event::fake();
        Bus::fake();
        [$player, $game, $round] = $this->makeScenario('player_one_id');

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload());

        Bus::assertDispatched(ForceEndRound::class, fn (ForceEndRound $job) => $job->roundId === $round->getKey());
    }

    public function test_force_end_round_delay_is_min_remaining_or_fifteen_seconds(): void
    {
        Event::fake();
        Bus::fake();
        $now = now();
        Date::setTestNow($now);

        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $round = Round::factory()->for($game)->create([
            'started_at' => $now->subSeconds(55),
        ]);

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload());

        $expected = $now->addSeconds(5);
        Bus::assertDispatched(ForceEndRound::class, function (ForceEndRound $job) use ($expected) {
            return $job->delay instanceof \DateTimeInterface
                && $job->delay->getTimestamp() === $expected->getTimestamp();
        });

        Date::setTestNow();
    }

    public function test_force_end_round_job_is_not_dispatched_when_both_players_lock_in(): void
    {
        Event::fake();
        Bus::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $round = Round::factory()->for($game)->create([
            'player_two_guess_lat' => 51.5074,
            'player_two_guess_lng' => -0.1278,
            'player_two_locked_in' => true,
        ]);

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload());

        Bus::assertNotDispatched(ForceEndRound::class);
    }

    public function test_scores_are_evaluated_when_both_players_lock_in(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $round = Round::factory()->for($game)->create([
            'player_two_guess_lat' => 51.5074,
            'player_two_guess_lng' => -0.1278,
            'player_two_locked_in' => true,
        ]);

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload());

        $round->refresh();
        $this->assertNotNull($round->player_one_score);
        $this->assertNotNull($round->player_two_score);
    }

    public function test_boundary_lat_and_lng_values_are_valid(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);

        $round = Round::factory()->for($game)->create();
        $this->postJson($this->url($player, $game, $round), ['lat' => 90, 'lng' => 180])->assertOk();

        $round = Round::factory()->for($game)->create();
        $this->postJson($this->url($player, $game, $round), ['lat' => -90, 'lng' => -180])->assertOk();
    }

    // --- Authorization failures ---

    public function test_player_not_in_game_gets_403(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create();

        $this->postJson($this->url($player, $game, $round), $this->validPayload())
            ->assertForbidden();
    }

    public function test_round_belonging_to_a_different_game_gets_404(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $otherGame = Game::factory()->create();
        $round = Round::factory()->for($otherGame)->create();

        $this->postJson($this->url($player, $game, $round), $this->validPayload())
            ->assertNotFound();
    }

    public function test_player_one_cannot_change_guess_after_locking_in(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $round = Round::factory()->for($game)->create(['player_one_locked_in' => true]);

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload())
            ->assertOk();

        $this->assertDatabaseHas('rounds', [
            'id' => $round->getKey(),
            'player_one_guess_lat' => null,
            'player_one_guess_lng' => null,
            'player_one_locked_in' => true,
        ]);
    }

    public function test_player_two_cannot_change_guess_after_locking_in(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_two_id' => $player->getKey()]);
        $round = Round::factory()->for($game)->create(['player_two_locked_in' => true]);

        $this->postJson($this->url($player, $game, $round), $this->lockedPayload())
            ->assertOk();

        $this->assertDatabaseHas('rounds', [
            'id' => $round->getKey(),
            'player_two_guess_lat' => null,
            'player_two_guess_lng' => null,
            'player_two_locked_in' => true,
        ]);
    }

    // --- Validation failures ---

    public function test_lat_is_required(): void
    {
        [$player, $game, $round] = $this->makeScenario();

        $this->postJson($this->url($player, $game, $round), ['lng' => 2.3522])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lat');
    }

    public function test_lng_is_required(): void
    {
        [$player, $game, $round] = $this->makeScenario();

        $this->postJson($this->url($player, $game, $round), ['lat' => 48.8566])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lng');
    }

    public function test_lat_must_be_numeric(): void
    {
        [$player, $game, $round] = $this->makeScenario();

        $this->postJson($this->url($player, $game, $round), ['lat' => 'abc', 'lng' => 2.3522])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lat');
    }

    public function test_lng_must_be_numeric(): void
    {
        [$player, $game, $round] = $this->makeScenario();

        $this->postJson($this->url($player, $game, $round), ['lat' => 48.8566, 'lng' => 'abc'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lng');
    }

    public function test_lat_cannot_exceed_90(): void
    {
        [$player, $game, $round] = $this->makeScenario();

        $this->postJson($this->url($player, $game, $round), ['lat' => 90.0001, 'lng' => 2.3522])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lat');
    }

    public function test_lat_cannot_be_less_than_minus_90(): void
    {
        [$player, $game, $round] = $this->makeScenario();

        $this->postJson($this->url($player, $game, $round), ['lat' => -90.0001, 'lng' => 2.3522])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lat');
    }

    public function test_lng_cannot_exceed_180(): void
    {
        [$player, $game, $round] = $this->makeScenario();

        $this->postJson($this->url($player, $game, $round), ['lat' => 48.8566, 'lng' => 180.0001])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lng');
    }

    public function test_lng_cannot_be_less_than_minus_180(): void
    {
        [$player, $game, $round] = $this->makeScenario();

        $this->postJson($this->url($player, $game, $round), ['lat' => 48.8566, 'lng' => -180.0001])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lng');
    }
}
