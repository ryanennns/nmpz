<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Events\RematchAccepted;
use App\Events\RematchRequested;
use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class RequestRematchTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_one_can_request_rematch(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create([
            'player_one_id' => $player->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $player->getKey(),
        ]);

        $this->postJson(route('games.rematch', [$player, $game]))
            ->assertOk()
            ->assertJson(['status' => 'requested']);

        $this->assertDatabaseHas('games', [
            'id' => $game->getKey(),
            'player_one_rematch_requested' => true,
        ]);
    }

    public function test_player_two_can_request_rematch(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create([
            'player_two_id' => $player->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $player->getKey(),
        ]);

        $this->postJson(route('games.rematch', [$player, $game]))
            ->assertOk()
            ->assertJson(['status' => 'requested']);

        $this->assertDatabaseHas('games', [
            'id' => $game->getKey(),
            'player_two_rematch_requested' => true,
        ]);
    }

    public function test_rematch_requested_event_is_dispatched(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $game = Game::factory()->create([
            'player_one_id' => $player->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $player->getKey(),
        ]);

        $this->postJson(route('games.rematch', [$player, $game]));

        Event::assertDispatched(RematchRequested::class, function (RematchRequested $event) use ($game) {
            return $event->game->getKey() === $game->getKey();
        });
    }

    public function test_both_players_requesting_creates_new_game(): void
    {
        Event::fake();
        Queue::fake();
        $map = Map::factory()->create(['name' => 'likeacw-mapillary']);
        Location::factory()->for($map)->create();

        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();
        $game = Game::factory()->create([
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $p1->getKey(),
            'player_one_rematch_requested' => true,
        ]);

        $this->postJson(route('games.rematch', [$p2, $game]))
            ->assertOk()
            ->assertJson(['status' => 'accepted'])
            ->assertJsonStructure(['new_game_id']);

        Event::assertDispatched(RematchAccepted::class);
    }

    public function test_player_not_in_game_gets_403(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create([
            'status' => GameStatus::Completed,
            'winner_id' => null,
        ]);

        $this->postJson(route('games.rematch', [$player, $game]))
            ->assertForbidden();
    }

    public function test_non_completed_game_gets_422(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->inProgress()->create([
            'player_one_id' => $player->getKey(),
        ]);

        $this->postJson(route('games.rematch', [$player, $game]))
            ->assertStatus(422);
    }

    public function test_game_with_existing_rematch_gets_422(): void
    {
        $player = Player::factory()->create();
        $newGame = Game::factory()->create();
        $game = Game::factory()->create([
            'player_one_id' => $player->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $player->getKey(),
            'rematch_game_id' => $newGame->getKey(),
        ]);

        $this->postJson(route('games.rematch', [$player, $game]))
            ->assertStatus(422);
    }
}
