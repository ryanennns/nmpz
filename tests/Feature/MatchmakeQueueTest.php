<?php

namespace Tests\Feature;

use App\Actions\CreateMatch;
use App\Actions\MatchmakeQueue;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MatchmakeQueueTest extends TestCase
{
    use RefreshDatabase;

    private function setupMap(): void
    {
        $map = Map::factory()->create(['name' => 'likeacw-mapillary']);
        Location::factory()->for($map)->create();
    }

    public function test_returns_zero_when_queue_has_fewer_than_two_players(): void
    {
        $p1 = Player::factory()->create();
        Cache::put('matchmaking_queue', [$p1->getKey()]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(0, $result);
    }

    public function test_returns_zero_when_queue_is_empty(): void
    {
        Cache::put('matchmaking_queue', []);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(0, $result);
    }

    public function test_matches_two_players_with_similar_elo(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1050)->create();
        Cache::put('matchmaking_queue', [$p1->getKey(), $p2->getKey()]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(1, $result);
        $remaining = Cache::get('matchmaking_queue');
        $this->assertEmpty($remaining);
    }

    public function test_does_not_match_players_outside_elo_window(): void
    {
        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(2500)->create();
        Cache::put('matchmaking_queue', [$p1->getKey(), $p2->getKey()]);
        Cache::put('matchmaking_queue_times', [
            $p1->getKey() => time(),
            $p2->getKey() => time(),
        ]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(0, $result);
    }

    public function test_removes_matched_players_from_queue(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1010)->create();
        $p3 = Player::factory()->withElo(2500)->create();
        Cache::put('matchmaking_queue', [$p1->getKey(), $p2->getKey(), $p3->getKey()]);
        Cache::put('matchmaking_queue_times', [
            $p1->getKey() => time(),
            $p2->getKey() => time(),
            $p3->getKey() => time(),
        ]);

        app(MatchmakeQueue::class)->handle();

        $remaining = Cache::get('matchmaking_queue');
        $this->assertCount(1, $remaining);
        $this->assertContains($p3->getKey(), $remaining);
    }

    public function test_returns_zero_when_lock_cannot_be_acquired(): void
    {
        $lock = Cache::lock('matchmaking_queue_lock', 10);
        $lock->get();

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(0, $result);

        $lock->release();
    }

    public function test_cleans_up_join_times_for_matched_players(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1050)->create();
        Cache::put('matchmaking_queue', [$p1->getKey(), $p2->getKey()]);
        Cache::put('matchmaking_queue_times', [
            $p1->getKey() => time(),
            $p2->getKey() => time(),
        ]);

        app(MatchmakeQueue::class)->handle();

        $joinTimes = Cache::get('matchmaking_queue_times');
        $this->assertEmpty($joinTimes);
    }

    public function test_elo_window_expands_with_wait_time(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1500)->create();

        // Set join times 60 seconds ago so window expands (200 + 60*10 = 800, which covers 500 diff)
        $joinTimes = [
            $p1->getKey() => time() - 60,
            $p2->getKey() => time() - 60,
        ];
        Cache::put('matchmaking_queue', [$p1->getKey(), $p2->getKey()]);
        Cache::put('matchmaking_queue_times', $joinTimes);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(1, $result);
    }

    public function test_deduplicates_queue_entries(): void
    {
        $p1 = Player::factory()->create();
        Cache::put('matchmaking_queue', [$p1->getKey(), $p1->getKey()]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(0, $result);
    }

    public function test_filters_out_deleted_players_from_queue(): void
    {
        $deletedId = 'non-existent-id';
        $p1 = Player::factory()->create();
        Cache::put('matchmaking_queue', [$deletedId, $p1->getKey()]);

        $result = app(MatchmakeQueue::class)->handle();

        $this->assertSame(0, $result);
    }
}
