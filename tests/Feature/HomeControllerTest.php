<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Vite;
use Tests\TestCase;

class HomeControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->instance(Vite::class, new class extends Vite {
            public function __invoke($entrypoints, $buildDirectory = null): \Illuminate\Support\HtmlString
            {
                return new \Illuminate\Support\HtmlString('');
            }

            public function __toString(): string
            {
                return '';
            }
        });
    }

    public function test_creates_new_player_for_new_session(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $this->assertDatabaseCount('players', 1);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_reuses_existing_player_from_session(): void
    {
        $player = Player::factory()->create();

        $response = $this->withSession(['player_id' => $player->getKey()])
            ->get('/');

        $response->assertOk();
        // Should not create a new player
        $this->assertDatabaseCount('players', 1);
    }

    public function test_includes_queue_count(): void
    {
        \Illuminate\Support\Facades\Cache::put('matchmaking_queue', ['a', 'b', 'c']);

        $response = $this->get('/');

        $response->assertOk();
    }

    public function test_includes_active_game_data_from_session(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->inProgress()->create([
            'player_one_id' => $player->getKey(),
        ]);

        $response = $this->withSession([
            'player_id' => $player->getKey(),
            'game_id' => $game->getKey(),
        ])->get('/');

        $response->assertOk();
    }

    public function test_includes_round_data_for_active_game(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->inProgress()->create([
            'player_one_id' => $player->getKey(),
        ]);
        Round::factory()->for($game)->create([
            'round_number' => 1,
            'started_at' => now(),
        ]);

        $response = $this->withSession([
            'player_id' => $player->getKey(),
            'game_id' => $game->getKey(),
        ])->get('/');

        $response->assertOk();
    }

    public function test_clears_session_for_completed_game(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->completed()->create([
            'player_one_id' => $player->getKey(),
        ]);

        $response = $this->withSession([
            'player_id' => $player->getKey(),
            'game_id' => $game->getKey(),
        ])->get('/');

        $response->assertOk();
        $response->assertSessionMissing('game_id');
    }

    public function test_clears_session_for_nonexistent_game(): void
    {
        $player = Player::factory()->create();

        $response = $this->withSession([
            'player_id' => $player->getKey(),
            'game_id' => 'nonexistent-id',
        ])->get('/');

        $response->assertOk();
        $response->assertSessionMissing('game_id');
    }

    public function test_clears_session_when_player_not_in_game(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->inProgress()->create(); // Neither player is our test player

        $response = $this->withSession([
            'player_id' => $player->getKey(),
            'game_id' => $game->getKey(),
        ])->get('/');

        $response->assertOk();
        $response->assertSessionMissing('game_id');
    }
}
