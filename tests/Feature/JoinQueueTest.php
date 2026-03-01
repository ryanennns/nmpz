<?php

namespace Tests\Feature;

use App\Jobs\MatchmakeQueueJob;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class JoinQueueTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_joins_queue_successfully(): void
    {
        Queue::fake();
        $player = Player::factory()->create();

        $this->postJson(route('players.join-queue', $player))
            ->assertOk()
            ->assertJson(['queued' => true]);

        $queue = Cache::get('matchmaking_queue');
        $this->assertContains($player->getKey(), $queue);
    }

    public function test_player_name_is_updated_when_provided(): void
    {
        Queue::fake();
        $player = Player::factory()->create(['name' => 'OldName']);

        $this->postJson(route('players.join-queue', $player), ['name' => 'NewName'])
            ->assertOk();

        $this->assertDatabaseHas('players', [
            'id' => $player->getKey(),
            'name' => 'NewName',
        ]);
    }

    public function test_returns_error_when_name_is_empty_and_player_has_no_name(): void
    {
        $player = Player::factory()->create(['name' => null]);

        $this->postJson(route('players.join-queue', $player))
            ->assertStatus(422)
            ->assertJson(['error' => 'Name is required']);
    }

    public function test_player_cannot_join_queue_with_active_game(): void
    {
        $player = Player::factory()->create();
        Game::factory()->inProgress()->create([
            'player_one_id' => $player->getKey(),
        ]);

        Cache::put('matchmaking_queue', []);

        $this->postJson(route('players.join-queue', $player))
            ->assertStatus(409)
            ->assertJson(['error' => 'Player already in game']);
    }

    public function test_dispatches_matchmaking_job(): void
    {
        Queue::fake();
        $player = Player::factory()->create();

        $this->postJson(route('players.join-queue', $player));

        Queue::assertPushed(MatchmakeQueueJob::class);
    }

    public function test_records_join_time(): void
    {
        Queue::fake();
        $player = Player::factory()->create();

        $this->postJson(route('players.join-queue', $player));

        $joinTimes = Cache::get('matchmaking_queue_times');
        $this->assertArrayHasKey($player->getKey(), $joinTimes);
    }

    public function test_does_not_overwrite_existing_join_time(): void
    {
        Queue::fake();
        $player = Player::factory()->create();
        $originalTime = time() - 100;
        Cache::put('matchmaking_queue_times', [$player->getKey() => $originalTime]);

        $this->postJson(route('players.join-queue', $player));

        $joinTimes = Cache::get('matchmaking_queue_times');
        $this->assertSame($originalTime, $joinTimes[$player->getKey()]);
    }

    public function test_player_name_too_long_returns_validation_error(): void
    {
        $player = Player::factory()->create();

        $this->postJson(route('players.join-queue', $player), [
            'name' => str_repeat('a', 33),
        ])->assertUnprocessable();
    }

    public function test_updates_user_name_when_player_name_is_updated(): void
    {
        Queue::fake();
        $player = Player::factory()->create(['name' => 'OldName']);

        $this->postJson(route('players.join-queue', $player), ['name' => 'NewName']);

        $this->assertDatabaseHas('users', [
            'id' => $player->user_id,
            'name' => 'NewName',
        ]);
    }

    public function test_returns_queue_count(): void
    {
        Queue::fake();
        $player = Player::factory()->create();

        $response = $this->postJson(route('players.join-queue', $player));

        $response->assertJsonStructure(['queued', 'queue_count']);
        $this->assertSame(1, $response->json('queue_count'));
    }
}
