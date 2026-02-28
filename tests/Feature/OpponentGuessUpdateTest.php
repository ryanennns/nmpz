<?php

namespace Tests\Feature;

use App\Events\OpponentGuessUpdate;
use App\Events\PlayerGuessed;
use App\Events\RoundFinished;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class OpponentGuessUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_broadcasts_opponent_guess_when_opponent_locked_in(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $round = Round::factory()->for($game)->create([
            'player_two_locked_in' => true,
            'player_two_guess_lat' => 51.5,
            'player_two_guess_lng' => -0.1,
        ]);

        // Player one sends non-locked guess while player two is locked in
        $this->postJson(route('games.rounds.guess', [$player, $game, $round]), [
            'lat' => 48.8566,
            'lng' => 2.3522,
        ]);

        Event::assertDispatched(OpponentGuessUpdate::class, function (OpponentGuessUpdate $e) use ($player) {
            return $e->playerId === $player->getKey()
                && $e->lat === 48.8566
                && $e->lng === 2.3522;
        });
    }

    public function test_does_not_broadcast_when_opponent_not_locked_in(): void
    {
        Event::fake();
        Bus::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $round = Round::factory()->for($game)->create([
            'player_two_locked_in' => false,
        ]);

        $this->postJson(route('games.rounds.guess', [$player, $game, $round]), [
            'lat' => 48.8566,
            'lng' => 2.3522,
        ]);

        Event::assertNotDispatched(OpponentGuessUpdate::class);
    }

    public function test_throttles_opponent_guess_updates(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $round = Round::factory()->for($game)->create([
            'player_two_locked_in' => true,
            'player_two_guess_lat' => 51.5,
            'player_two_guess_lng' => -0.1,
        ]);

        // Set cache key to simulate throttle
        Cache::put("opponent_guess_throttle:{$round->getKey()}:{$player->getKey()}", true, now()->addMilliseconds(500));

        $this->postJson(route('games.rounds.guess', [$player, $game, $round]), [
            'lat' => 48.8566,
            'lng' => 2.3522,
        ]);

        Event::assertNotDispatched(OpponentGuessUpdate::class);
    }

    public function test_does_not_broadcast_when_player_is_locked_in(): void
    {
        Event::fake();
        Bus::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $round = Round::factory()->for($game)->create([
            'player_one_locked_in' => true,
            'player_two_locked_in' => true,
            'player_two_guess_lat' => 51.5,
            'player_two_guess_lng' => -0.1,
        ]);

        $this->postJson(route('games.rounds.guess', [$player, $game, $round]), [
            'lat' => 48.8566,
            'lng' => 2.3522,
        ]);

        // Player is already locked in so the guess is not saved, no broadcast
        Event::assertNotDispatched(OpponentGuessUpdate::class);
    }
}
