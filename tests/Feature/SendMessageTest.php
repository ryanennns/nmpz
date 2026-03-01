<?php

namespace Tests\Feature;

use App\Events\GameMessage;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class SendMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_can_send_message(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);

        $this->postJson(route('games.send-message', [$player, $game]), ['message' => 'Hello!'])
            ->assertOk()
            ->assertJson(['ok' => true]);

        Event::assertDispatched(GameMessage::class, function (GameMessage $event) use ($game, $player) {
            return $event->game->getKey() === $game->getKey()
                && $event->player->getKey() === $player->getKey()
                && $event->message === 'Hello!';
        });
    }

    public function test_player_not_in_game_gets_403(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create();

        $this->postJson(route('games.send-message', [$player, $game]), ['message' => 'Hello!'])
            ->assertForbidden();
    }

    public function test_message_is_required(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);

        $this->postJson(route('games.send-message', [$player, $game]), [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('message');
    }

    public function test_message_cannot_exceed_255_characters(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);

        $this->postJson(route('games.send-message', [$player, $game]), ['message' => str_repeat('a', 256)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('message');
    }

    public function test_player_two_can_send_message(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_two_id' => $player->getKey()]);

        $this->postJson(route('games.send-message', [$player, $game]), ['message' => 'Hi!'])
            ->assertOk();
    }
}
