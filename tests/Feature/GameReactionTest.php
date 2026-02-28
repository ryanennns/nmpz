<?php

namespace Tests\Feature;

use App\Events\GameReaction;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Broadcasting\Channel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class GameReactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_can_send_reaction(): void
    {
        Event::fake();
        $game = Game::factory()->inProgress()->create();
        $player = Player::find($game->player_one_id);

        $response = $this->postJson("/players/{$player->getKey()}/games/{$game->getKey()}/reaction", [
            'reaction' => 'gg',
        ]);

        $response->assertOk();
        $response->assertJson(['sent' => true]);
        Event::assertDispatched(GameReaction::class);
    }

    public function test_non_player_cannot_send_reaction(): void
    {
        $game = Game::factory()->inProgress()->create();
        $outsider = Player::factory()->create();

        $response = $this->postJson("/players/{$outsider->getKey()}/games/{$game->getKey()}/reaction", [
            'reaction' => 'gg',
        ]);

        $response->assertForbidden();
    }

    public function test_invalid_reaction_rejected(): void
    {
        $game = Game::factory()->inProgress()->create();
        $player = Player::find($game->player_one_id);

        $response = $this->postJson("/players/{$player->getKey()}/games/{$game->getKey()}/reaction", [
            'reaction' => 'invalid_emoji',
        ]);

        $response->assertUnprocessable();
    }

    public function test_reaction_broadcasts_on_game_channel(): void
    {
        $game = Game::factory()->create();
        $player = Player::find($game->player_one_id);

        $event = new GameReaction($game, $player->getKey(), 'gg');

        $this->assertEquals(new Channel("game.{$game->getKey()}"), $event->broadcastOn());
        $this->assertSame('GameReaction', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertSame('gg', $data['reaction']);
        $this->assertSame($player->getKey(), $data['player_id']);
    }

    public function test_all_reactions_are_valid(): void
    {
        Event::fake();
        $game = Game::factory()->inProgress()->create();
        $player = Player::find($game->player_one_id);

        foreach (GameReaction::ALLOWED_REACTIONS as $reaction) {
            $response = $this->postJson("/players/{$player->getKey()}/games/{$game->getKey()}/reaction", [
                'reaction' => $reaction,
            ]);
            $response->assertOk();
        }
    }
}
