<?php

namespace Tests\Feature;

use App\Actions\MatchmakeQueue;
use App\Jobs\MatchmakeQueueJob;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MatchmakeQueueJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_calls_matchmaker_handle(): void
    {
        Cache::put('matchmaking_queue', []);

        $mock = $this->mock(MatchmakeQueue::class);
        $mock->shouldReceive('handle')->once()->andReturn(0);

        $job = new MatchmakeQueueJob;
        $job->handle($mock);
    }

    public function test_dispatches_self_when_queue_has_two_or_more(): void
    {
        Queue::fake();

        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();
        Cache::put('matchmaking_queue', [$p1->getKey(), $p2->getKey()]);

        $mock = $this->mock(MatchmakeQueue::class);
        $mock->shouldReceive('handle')->once()->andReturn(0);

        $job = new MatchmakeQueueJob;
        $job->handle($mock);

        Queue::assertPushed(MatchmakeQueueJob::class);
    }

    public function test_does_not_dispatch_self_when_queue_has_fewer_than_two(): void
    {
        Queue::fake();

        Cache::put('matchmaking_queue', ['single-id']);

        $mock = $this->mock(MatchmakeQueue::class);
        $mock->shouldReceive('handle')->once()->andReturn(0);

        $job = new MatchmakeQueueJob;
        $job->handle($mock);

        Queue::assertNotPushed(MatchmakeQueueJob::class);
    }
}
