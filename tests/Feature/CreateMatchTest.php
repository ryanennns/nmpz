<?php

namespace Tests\Feature;

use App\Actions\CreateMatch;
use App\Enums\GameStatus;
use App\Events\GameReady;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class CreateMatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_game_with_two_players(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        $game = app(CreateMatch::class)->handle($p1, $p2);

        $this->assertDatabaseHas('games', [
            'id' => $game->getKey(),
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'status' => GameStatus::InProgress->value,
        ]);
    }

    public function test_creates_first_round(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        $game = app(CreateMatch::class)->handle($p1, $p2);

        $this->assertDatabaseHas('rounds', [
            'game_id' => $game->getKey(),
            'round_number' => 1,
        ]);
    }

    public function test_dispatches_game_ready_events_for_both_players(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        app(CreateMatch::class)->handle($p1, $p2);

        Event::assertDispatched(GameReady::class, 2);
    }

    public function test_aborts_when_no_locations_available(): void
    {
        Event::fake();
        Map::factory()->create(['name' => 'likeacw-mapillary']);
        // Delete the auto-created location from MapFactory::configure
        Location::query()->delete();

        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        app(CreateMatch::class)->handle($p1, $p2);
    }

    public function test_assigns_map_and_seed(): void
    {
        Event::fake();
        Queue::fake();
        $map = $this->setupMap();

        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        $game = app(CreateMatch::class)->handle($p1, $p2);

        $this->assertEquals($map->getKey(), $game->map_id);
        $this->assertNotNull($game->seed);
    }

    public function test_delayed_dispatch_sets_started_at_and_fires_events(): void
    {
        Event::fake();
        $this->setupMap();

        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        // Don't fake the queue so the closure executes synchronously
        $game = app(CreateMatch::class)->handle($p1, $p2);

        $round = $game->rounds()->first();
        $round->refresh();

        $this->assertNotNull($round->started_at);

        Event::assertDispatched(RoundStarted::class);
        Event::assertDispatched(GameReady::class);
    }
}
