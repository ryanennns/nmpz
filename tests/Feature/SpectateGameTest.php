<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpectateGameTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_spectate_in_progress_game(): void
    {
        $game = Game::factory()->inProgress()->create([
            'allow_spectators' => true,
        ]);

        $response = $this->get("/games/{$game->getKey()}/spectate");

        $response->assertOk();
    }

    public function test_cannot_spectate_completed_game(): void
    {
        $game = Game::factory()->create([
            'status' => GameStatus::Completed,
            'allow_spectators' => true,
        ]);

        $response = $this->get("/games/{$game->getKey()}/spectate");

        $response->assertNotFound();
    }

    public function test_cannot_spectate_when_spectating_disabled(): void
    {
        $game = Game::factory()->inProgress()->create([
            'allow_spectators' => false,
        ]);

        $response = $this->get("/games/{$game->getKey()}/spectate");

        $response->assertForbidden();
    }

    public function test_creates_spectator_record(): void
    {
        $game = Game::factory()->inProgress()->create([
            'allow_spectators' => true,
        ]);

        $this->get("/games/{$game->getKey()}/spectate");

        $this->assertDatabaseHas('spectators', [
            'game_id' => $game->getKey(),
        ]);
    }

    public function test_increments_spectator_count(): void
    {
        $game = Game::factory()->inProgress()->create([
            'allow_spectators' => true,
            'spectator_count' => 0,
        ]);

        $this->get("/games/{$game->getKey()}/spectate");

        $game->refresh();
        $this->assertSame(1, $game->spectator_count);
    }

    public function test_returns_completed_rounds(): void
    {
        $game = Game::factory()->inProgress()->create([
            'allow_spectators' => true,
        ]);
        Round::factory()->for($game)->create([
            'round_number' => 1,
            'finished_at' => now(),
            'player_one_score' => 4000,
            'player_two_score' => 3000,
        ]);

        $response = $this->get("/games/{$game->getKey()}/spectate");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('spectate')
            ->has('completed_rounds', 1)
            ->where('completed_rounds.0.round_number', 1)
            ->where('completed_rounds.0.player_one_score', 4000)
        );
    }

    public function test_returns_current_round_number(): void
    {
        $game = Game::factory()->inProgress()->create([
            'allow_spectators' => true,
        ]);
        Round::factory()->for($game)->create([
            'round_number' => 1,
            'finished_at' => now(),
        ]);
        Round::factory()->for($game)->create([
            'round_number' => 2,
            'finished_at' => null,
        ]);

        $response = $this->get("/games/{$game->getKey()}/spectate");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('spectate')
            ->where('current_round_number', 2)
        );
    }
}
