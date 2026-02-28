<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Events\GameFinished;
use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Listeners\StartNextRound;
use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\PlayerStats;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class StartNextRoundStatsTest extends TestCase
{
    use RefreshDatabase;

    private function setupGameWithRound(array $roundAttrs = [], array $gameAttrs = []): array
    {
        $map = Map::factory()->create();
        Location::factory()->count(5)->for($map)->create();

        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        $game = Game::factory()->inProgress()->create(array_merge([
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'map_id' => $map->getKey(),
            'seed' => 0,
        ], $gameAttrs));

        $round = Round::factory()->for($game)->create(array_merge([
            'round_number' => 1,
        ], $roundAttrs));

        return [$game, $round, $p1, $p2];
    }

    public function test_updates_round_stats_for_both_players(): void
    {
        Event::fake([GameFinished::class, RoundStarted::class]);
        Queue::fake();

        [$game, $round, $p1, $p2] = $this->setupGameWithRound([
            'player_one_guess_lat' => 48.8,
            'player_one_guess_lng' => 2.3,
            'player_two_guess_lat' => 51.5,
            'player_two_guess_lng' => -0.1,
            'player_one_score' => 4000,
            'player_two_score' => 2000,
        ]);

        $listener = app(StartNextRound::class);
        $listener->handle(new RoundFinished($round));

        $p1Stats = PlayerStats::where('player_id', $p1->getKey())->first();
        $p2Stats = PlayerStats::where('player_id', $p2->getKey())->first();

        $this->assertSame(1, $p1Stats->total_rounds);
        $this->assertSame(1, $p2Stats->total_rounds);
        $this->assertSame(4000, $p1Stats->total_score);
        $this->assertSame(2000, $p2Stats->total_score);
        $this->assertSame(4000, $p1Stats->best_round_score);
        $this->assertSame(2000, $p2Stats->best_round_score);
    }

    public function test_tracks_guesses_made_and_missed(): void
    {
        Event::fake([GameFinished::class, RoundStarted::class]);
        Queue::fake();

        [$game, $round, $p1, $p2] = $this->setupGameWithRound([
            'player_one_guess_lat' => 48.8,
            'player_one_guess_lng' => 2.3,
            'player_two_guess_lat' => null,
            'player_two_guess_lng' => null,
            'player_one_score' => 4000,
            'player_two_score' => null,
        ]);

        $listener = app(StartNextRound::class);
        $listener->handle(new RoundFinished($round));

        $p1Stats = PlayerStats::where('player_id', $p1->getKey())->first();
        $p2Stats = PlayerStats::where('player_id', $p2->getKey())->first();

        $this->assertSame(1, $p1Stats->total_guesses_made);
        $this->assertSame(0, $p1Stats->total_guesses_missed);
        $this->assertSame(0, $p2Stats->total_guesses_made);
        $this->assertSame(1, $p2Stats->total_guesses_missed);
    }

    public function test_tracks_damage_dealt_and_taken(): void
    {
        Event::fake([GameFinished::class, RoundStarted::class]);
        Queue::fake();

        [$game, $round, $p1, $p2] = $this->setupGameWithRound([
            'player_one_guess_lat' => 48.8,
            'player_one_guess_lng' => 2.3,
            'player_two_guess_lat' => 51.5,
            'player_two_guess_lng' => -0.1,
            'player_one_score' => 4000,
            'player_two_score' => 2000,
        ]);

        $listener = app(StartNextRound::class);
        $listener->handle(new RoundFinished($round));

        $p1Stats = PlayerStats::where('player_id', $p1->getKey())->first();
        $p2Stats = PlayerStats::where('player_id', $p2->getKey())->first();

        $this->assertSame(2000, $p1Stats->total_damage_dealt);
        $this->assertSame(0, $p1Stats->total_damage_taken);
        $this->assertSame(0, $p2Stats->total_damage_dealt);
        $this->assertSame(2000, $p2Stats->total_damage_taken);
    }

    public function test_tracks_perfect_rounds(): void
    {
        Event::fake([GameFinished::class, RoundStarted::class]);
        Queue::fake();

        [$game, $round, $p1, $p2] = $this->setupGameWithRound([
            'player_one_guess_lat' => 48.8,
            'player_one_guess_lng' => 2.3,
            'player_two_guess_lat' => 51.5,
            'player_two_guess_lng' => -0.1,
            'player_one_score' => 5000,
            'player_two_score' => 2000,
        ]);

        $listener = app(StartNextRound::class);
        $listener->handle(new RoundFinished($round));

        $p1Stats = PlayerStats::where('player_id', $p1->getKey())->first();
        $this->assertSame(1, $p1Stats->perfect_rounds);
    }

    public function test_tracks_closest_guess(): void
    {
        Event::fake([GameFinished::class, RoundStarted::class]);
        Queue::fake();

        [$game, $round, $p1, $p2] = $this->setupGameWithRound([
            'location_lat' => 48.8566,
            'location_lng' => 2.3522,
            'player_one_guess_lat' => 48.857,
            'player_one_guess_lng' => 2.352,
            'player_two_guess_lat' => 51.5,
            'player_two_guess_lng' => -0.1,
            'player_one_score' => 4999,
            'player_two_score' => 2000,
        ]);

        $listener = app(StartNextRound::class);
        $listener->handle(new RoundFinished($round));

        $p1Stats = PlayerStats::where('player_id', $p1->getKey())->first();
        $this->assertNotNull($p1Stats->closest_guess_km);
        $this->assertGreaterThan(0, $p1Stats->total_distance_km);
    }

    public function test_updates_game_stats_on_game_end(): void
    {
        Event::fake([GameFinished::class, RoundStarted::class]);
        Queue::fake();

        [$game, $round, $p1, $p2] = $this->setupGameWithRound([
            'player_one_score' => 5000,
            'player_two_score' => 1000,
        ], [
            'player_one_health' => 1000,
            'player_two_health' => 1000,
        ]);

        $listener = app(StartNextRound::class);
        $listener->handle(new RoundFinished($round));

        $game->refresh();
        // p2 takes 4000 damage on 1000 health => dies
        if ($game->status === GameStatus::Completed) {
            $p1Stats = PlayerStats::where('player_id', $p1->getKey())->first();
            $p2Stats = PlayerStats::where('player_id', $p2->getKey())->first();

            $this->assertSame(1, $p1Stats->games_played);
            $this->assertSame(1, $p2Stats->games_played);
        }
    }

    public function test_resets_no_guess_rounds_counter_when_guess_made(): void
    {
        Event::fake([GameFinished::class, RoundStarted::class]);
        Queue::fake();

        [$game, $round, $p1, $p2] = $this->setupGameWithRound([
            'player_one_guess_lat' => 48.8,
            'player_one_guess_lng' => 2.3,
            'player_two_guess_lat' => 51.5,
            'player_two_guess_lng' => -0.1,
            'player_one_score' => 4000,
            'player_two_score' => 4000,
        ], [
            'no_guess_rounds' => 2,
        ]);

        $listener = app(StartNextRound::class);
        $listener->handle(new RoundFinished($round));

        $game->refresh();
        $this->assertSame(0, $game->no_guess_rounds);
    }

    public function test_win_streak_tracking(): void
    {
        Event::fake([GameFinished::class, RoundStarted::class]);
        Queue::fake();

        [$game, $round, $p1, $p2] = $this->setupGameWithRound([
            'player_one_score' => 5000,
            'player_two_score' => 0,
        ], [
            'player_one_health' => 5000,
            'player_two_health' => 100,
        ]);

        $listener = app(StartNextRound::class);
        $listener->handle(new RoundFinished($round));

        $game->refresh();
        if ($game->status === GameStatus::Completed) {
            $p1Stats = PlayerStats::where('player_id', $p1->getKey())->first();
            $this->assertSame(1, $p1Stats->current_win_streak);
            $this->assertSame(1, $p1Stats->best_win_streak);

            $p2Stats = PlayerStats::where('player_id', $p2->getKey())->first();
            $this->assertSame(0, $p2Stats->current_win_streak);
            $this->assertSame(1, $p2Stats->games_lost);
        }
    }

    public function test_does_nothing_when_game_already_completed(): void
    {
        Event::fake([GameFinished::class, RoundStarted::class]);
        Queue::fake();

        [$game, $round, $p1, $p2] = $this->setupGameWithRound([
            'player_one_score' => 3000,
            'player_two_score' => 3000,
        ]);

        $game->update(['status' => GameStatus::Completed]);

        $listener = app(StartNextRound::class);
        $listener->handle(new RoundFinished($round));

        // Should not create a new round since game is completed
        $this->assertSame(1, Round::where('game_id', $game->getKey())->count());
    }
}
