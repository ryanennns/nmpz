<?php

namespace Tests\Unit;

use App\Events\GameFinished;
use App\Events\GameMessage;
use App\Events\GameReady;
use App\Events\OpponentGuessUpdate;
use App\Events\PlayerGuessed;
use App\Events\RematchAccepted;
use App\Events\RematchDeclined;
use App\Events\RematchRequested;
use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventBroadcastTest extends TestCase
{
    use RefreshDatabase;

    // --- GameFinished ---

    public function test_game_finished_broadcasts_on_game_channel(): void
    {
        $game = Game::factory()->create();
        $event = new GameFinished($game);

        $this->assertEquals(new Channel("game.{$game->getKey()}"), $event->broadcastOn());
        $this->assertSame('GameFinished', $event->broadcastAs());
    }

    public function test_game_finished_broadcast_data(): void
    {
        $game = Game::factory()->create([
            'player_one_health' => 3000,
            'player_two_health' => 0,
            'player_one_rating_change' => 25,
            'player_two_rating_change' => -25,
        ]);
        $game->update(['winner_id' => $game->player_one_id]);

        $event = new GameFinished($game);
        $data = $event->broadcastWith();

        $this->assertSame($game->getKey(), $data['game_id']);
        $this->assertSame($game->player_one_id, $data['winner_id']);
        $this->assertSame(3000, $data['player_one_health']);
        $this->assertSame(0, $data['player_two_health']);
        $this->assertSame(25, $data['player_one_rating_change']);
        $this->assertSame(-25, $data['player_two_rating_change']);
        $this->assertArrayHasKey('player_one_elo', $data);
        $this->assertArrayHasKey('player_two_elo', $data);
    }

    // --- GameMessage ---

    public function test_game_message_broadcasts_correctly(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $player->load('user');

        $event = new GameMessage($game, $player, 'Hello world');

        $this->assertEquals(new Channel("game.{$game->getKey()}"), $event->broadcastOn());
        $this->assertSame('GameMessage', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertSame($game->getKey(), $data['game_id']);
        $this->assertSame($player->getKey(), $data['player_id']);
        $this->assertSame($player->user->name, $data['player_name']);
        $this->assertSame('Hello world', $data['message']);
    }

    // --- GameReady ---

    public function test_game_ready_broadcasts_on_player_channel(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);

        $event = new GameReady($game, $player);

        $this->assertEquals(new Channel("player.{$player->getKey()}"), $event->broadcastOn());
        $this->assertSame('GameReady', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertArrayHasKey('game', $data);
        $this->assertSame($game->getKey(), $data['game']['id']);
    }

    // --- OpponentGuessUpdate ---

    public function test_opponent_guess_update_broadcasts_correctly(): void
    {
        $game = Game::factory()->create();

        $event = new OpponentGuessUpdate($game, 'player-123', 48.8566, 2.3522);

        $this->assertEquals(new Channel("game.{$game->getKey()}"), $event->broadcastOn());
        $this->assertSame('OpponentGuessUpdate', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertSame('player-123', $data['player_id']);
        $this->assertSame(48.8566, $data['lat']);
        $this->assertSame(2.3522, $data['lng']);
    }

    // --- PlayerGuessed ---

    public function test_player_guessed_broadcasts_correctly(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_locked_in' => true,
            'player_two_locked_in' => false,
        ]);
        $player = Player::find($game->player_one_id);

        $event = new PlayerGuessed($round, $player);

        $this->assertEquals(new Channel("game.{$game->getKey()}"), $event->broadcastOn());
        $this->assertSame('PlayerGuessed', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertSame($game->getKey(), $data['game_id']);
        $this->assertSame($round->getKey(), $data['round_id']);
        $this->assertSame($player->getKey(), $data['player_id']);
        $this->assertTrue($data['player_one_locked_in']);
        $this->assertFalse($data['player_two_locked_in']);
    }

    // --- RematchAccepted ---

    public function test_rematch_accepted_broadcasts_correctly(): void
    {
        $oldGame = Game::factory()->create();
        $newGame = Game::factory()->create();

        $event = new RematchAccepted($oldGame, $newGame);

        $this->assertEquals(new Channel("game.{$oldGame->getKey()}"), $event->broadcastOn());
        $this->assertSame('RematchAccepted', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertSame($oldGame->getKey(), $data['game_id']);
        $this->assertArrayHasKey('new_game', $data);
        $this->assertSame($newGame->getKey(), $data['new_game']['id']);
    }

    // --- RematchDeclined ---

    public function test_rematch_declined_broadcasts_correctly(): void
    {
        $game = Game::factory()->create();
        $player = Player::find($game->player_one_id);

        $event = new RematchDeclined($game, $player);

        $this->assertEquals(new Channel("game.{$game->getKey()}"), $event->broadcastOn());
        $this->assertSame('RematchDeclined', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertSame($game->getKey(), $data['game_id']);
        $this->assertSame($player->getKey(), $data['player_id']);
    }

    // --- RematchRequested ---

    public function test_rematch_requested_broadcasts_correctly(): void
    {
        $player = Player::factory()->create();
        $player->load('user');
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);

        $event = new RematchRequested($game, $player);

        $this->assertEquals(new Channel("game.{$game->getKey()}"), $event->broadcastOn());
        $this->assertSame('RematchRequested', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertSame($game->getKey(), $data['game_id']);
        $this->assertSame($player->getKey(), $data['player_id']);
        $this->assertSame($player->user->name, $data['player_name']);
    }

    public function test_rematch_requested_uses_fallback_name(): void
    {
        $user = User::factory()->create();
        $player = Player::factory()->create(['user_id' => $user->id, 'name' => 'FallbackName']);
        // Unload user relation so user is null
        $player->setRelation('user', null);
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);

        $event = new RematchRequested($game, $player);
        $data = $event->broadcastWith();

        $this->assertSame('FallbackName', $data['player_name']);
    }

    // --- RoundFinished ---

    public function test_round_finished_broadcasts_correctly(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_guess_lat' => 48.8566,
            'player_one_guess_lng' => 2.3522,
            'player_two_guess_lat' => 51.5074,
            'player_two_guess_lng' => -0.1278,
            'player_one_score' => 4500,
            'player_two_score' => 3000,
        ]);

        $event = new RoundFinished($round);

        $this->assertEquals(new Channel("game.{$game->getKey()}"), $event->broadcastOn());
        $this->assertSame('RoundFinished', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertSame($game->getKey(), $data['game_id']);
        $this->assertSame($round->getKey(), $data['round_id']);
        $this->assertSame(4500, $data['player_one_score']);
        $this->assertSame(3000, $data['player_two_score']);
        $this->assertNotNull($data['player_one_distance_km']);
        $this->assertNotNull($data['player_two_distance_km']);
    }

    public function test_round_finished_distance_is_null_when_no_guess(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_guess_lat' => null,
            'player_one_guess_lng' => null,
            'player_two_guess_lat' => null,
            'player_two_guess_lng' => null,
        ]);

        $event = new RoundFinished($round);
        $data = $event->broadcastWith();

        $this->assertNull($data['player_one_distance_km']);
        $this->assertNull($data['player_two_distance_km']);
    }

    // --- RoundStarted ---

    public function test_round_started_broadcasts_correctly(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'started_at' => now(),
        ]);

        $event = new RoundStarted($round, 5000, 4500);

        $this->assertEquals(new Channel("game.{$game->getKey()}"), $event->broadcastOn());
        $this->assertSame('RoundStarted', $event->broadcastAs());

        $data = $event->broadcastWith();
        $this->assertSame($game->getKey(), $data['game_id']);
        $this->assertSame($round->getKey(), $data['round_id']);
        $this->assertSame(5000, $data['player_one_health']);
        $this->assertSame(4500, $data['player_two_health']);
        $this->assertNotNull($data['location_lat']);
        $this->assertNotNull($data['location_lng']);
        $this->assertNotNull($data['started_at']);
    }

    public function test_round_started_with_null_started_at(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'started_at' => null,
        ]);

        $event = new RoundStarted($round, 5000, 5000);
        $data = $event->broadcastWith();

        $this->assertNull($data['started_at']);
    }
}
