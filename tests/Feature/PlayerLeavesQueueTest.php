<?php

namespace Tests\Feature;

use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class PlayerLeavesQueueTest extends TestCase
{
    use RefreshDatabase;

    private function url(Player $player): string
    {
        return route('players.leave-queue', $player);
    }

    public function test_player_is_removed_from_queue(): void
    {
        $player = Player::factory()->create();
        Cache::put('matchmaking_queue', [$player->getKey()]);

        $this->postJson($this->url($player))->assertNoContent();

        $this->assertSame([], Cache::get('matchmaking_queue'));
    }

    public function test_player_is_removed_from_middle_of_queue(): void
    {
        [$a, $b, $c] = Player::factory()->count(3)->create()->all();
        Cache::put('matchmaking_queue', [$a->getKey(), $b->getKey(), $c->getKey()]);

        $this->postJson($this->url($b))->assertNoContent();

        $this->assertSame([$a->getKey(), $c->getKey()], Cache::get('matchmaking_queue'));
    }

    public function test_returns_no_content_when_player_is_not_in_queue(): void
    {
        $player = Player::factory()->create();
        Cache::put('matchmaking_queue', []);

        $this->postJson($this->url($player))->assertNoContent();

        $this->assertSame([], Cache::get('matchmaking_queue'));
    }

    public function test_does_not_remove_other_players_from_queue(): void
    {
        $player = Player::factory()->create();
        $other = Player::factory()->create();
        Cache::put('matchmaking_queue', [$other->getKey()]);

        $this->postJson($this->url($player))->assertNoContent();

        $this->assertSame([$other->getKey()], Cache::get('matchmaking_queue'));
    }

    public function test_unknown_player_returns_404(): void
    {
        $this->postJson('/players/non-existent-id/leave-queue')->assertNotFound();
    }
}
