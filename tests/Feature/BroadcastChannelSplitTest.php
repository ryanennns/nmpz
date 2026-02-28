<?php

namespace Tests\Feature;

use App\Events\OpponentGuessUpdate;
use App\Events\PlayerGuessed;
use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Broadcasting\Channel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BroadcastChannelSplitTest extends TestCase
{
    use RefreshDatabase;

    public function test_round_started_broadcasts_on_players_channel(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create(['started_at' => now()]);

        $event = new RoundStarted($round, 5000, 5000);

        $this->assertEquals(
            new Channel("game.{$game->getKey()}.players"),
            $event->broadcastOn()
        );
    }

    public function test_opponent_guess_update_broadcasts_on_players_channel(): void
    {
        $game = Game::factory()->create();

        $event = new OpponentGuessUpdate($game, 'player-id', 48.0, 2.0);

        $this->assertEquals(
            new Channel("game.{$game->getKey()}.players"),
            $event->broadcastOn()
        );
    }

    public function test_round_finished_broadcasts_on_game_channel(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create();

        $event = new RoundFinished($round);

        $channel = $event->broadcastOn();
        $this->assertEquals(new Channel("game.{$game->getKey()}"), $channel);
        $this->assertNotEquals(new Channel("game.{$game->getKey()}.players"), $channel);
    }

    public function test_player_guessed_broadcasts_on_game_channel(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create();
        $player = Player::find($game->player_one_id);

        $event = new PlayerGuessed($round, $player);

        $channel = $event->broadcastOn();
        $this->assertEquals(new Channel("game.{$game->getKey()}"), $channel);
        $this->assertNotEquals(new Channel("game.{$game->getKey()}.players"), $channel);
    }
}
