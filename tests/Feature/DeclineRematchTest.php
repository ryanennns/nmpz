<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Events\RematchDeclined;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class DeclineRematchTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_can_decline_rematch(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create([
            'player_one_id' => $player->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $player->getKey(),
        ]);

        $this->postJson(route('games.decline-rematch', [$player, $game]))
            ->assertOk()
            ->assertJson(['status' => 'declined']);

        Event::assertDispatched(RematchDeclined::class, function (RematchDeclined $event) use ($game, $player) {
            return $event->game->getKey() === $game->getKey()
                && $event->player->getKey() === $player->getKey();
        });
    }

    public function test_player_not_in_game_gets_403(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create([
            'status' => GameStatus::Completed,
            'winner_id' => null,
        ]);

        $this->postJson(route('games.decline-rematch', [$player, $game]))
            ->assertForbidden();
    }

    public function test_non_completed_game_gets_422(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->inProgress()->create([
            'player_one_id' => $player->getKey(),
        ]);

        $this->postJson(route('games.decline-rematch', [$player, $game]))
            ->assertStatus(422);
    }

    public function test_player_two_can_decline_rematch(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create([
            'player_two_id' => $player->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => null,
        ]);

        $this->postJson(route('games.decline-rematch', [$player, $game]))
            ->assertOk()
            ->assertJson(['status' => 'declined']);
    }
}
