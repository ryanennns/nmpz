<?php

namespace Tests\Feature;

use App\Events\SpectatorChatMessage;
use App\Models\Game;
use Illuminate\Broadcasting\Channel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class SpectatorChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_send_spectator_chat(): void
    {
        Event::fake();
        $game = Game::factory()->inProgress()->create(['allow_spectators' => true]);

        $response = $this->postJson("/games/{$game->getKey()}/spectator-chat", [
            'message' => 'Nice guess!',
            'player_name' => 'Spectator1',
        ]);

        $response->assertOk();
        $response->assertJson(['sent' => true]);
        Event::assertDispatched(SpectatorChatMessage::class);
    }

    public function test_cannot_chat_when_spectating_disabled(): void
    {
        $game = Game::factory()->inProgress()->create(['allow_spectators' => false]);

        $response = $this->postJson("/games/{$game->getKey()}/spectator-chat", [
            'message' => 'Hello',
            'player_name' => 'Spectator1',
        ]);

        $response->assertForbidden();
    }

    public function test_message_max_length_validated(): void
    {
        $game = Game::factory()->inProgress()->create(['allow_spectators' => true]);

        $response = $this->postJson("/games/{$game->getKey()}/spectator-chat", [
            'message' => str_repeat('x', 201),
            'player_name' => 'Spectator1',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('message');
    }

    public function test_chat_broadcasts_on_spectator_channel(): void
    {
        $game = Game::factory()->create();

        $event = new SpectatorChatMessage($game, 'TestUser', 'Great round!');

        $this->assertEquals(
            new Channel("game.{$game->getKey()}.spectators"),
            $event->broadcastOn()
        );
        $this->assertSame('SpectatorChatMessage', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertSame('TestUser', $data['player_name']);
        $this->assertSame('Great round!', $data['message']);
    }

    public function test_chat_not_visible_on_players_channel(): void
    {
        $game = Game::factory()->create();
        $event = new SpectatorChatMessage($game, 'TestUser', 'Hello');

        $channel = $event->broadcastOn();

        $this->assertNotEquals(new Channel("game.{$game->getKey()}.players"), $channel);
        $this->assertNotEquals(new Channel("game.{$game->getKey()}"), $channel);
    }
}
