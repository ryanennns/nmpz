<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RememberGameSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_remembers_game_session(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->inProgress()->create(['player_one_id' => $player->getKey()]);

        $this->postJson(route('games.remember', [$player, $game]))
            ->assertOk()
            ->assertJson(['remembered' => true]);
    }

    public function test_forgets_game_session_when_active_is_false(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->inProgress()->create(['player_one_id' => $player->getKey()]);

        $this->postJson(route('games.remember', [$player, $game]), ['active' => false])
            ->assertOk()
            ->assertJson(['remembered' => false]);
    }

    public function test_returns_409_for_non_in_progress_game(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create([
            'player_one_id' => $player->getKey(),
            'status' => GameStatus::Completed,
        ]);

        $this->postJson(route('games.remember', [$player, $game]))
            ->assertStatus(409);
    }

    public function test_returns_403_for_player_not_in_game(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->inProgress()->create();

        $this->postJson(route('games.remember', [$player, $game]))
            ->assertForbidden();
    }

    public function test_player_two_can_remember_session(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->inProgress()->create(['player_two_id' => $player->getKey()]);

        $this->postJson(route('games.remember', [$player, $game]))
            ->assertOk()
            ->assertJson(['remembered' => true]);
    }
}
