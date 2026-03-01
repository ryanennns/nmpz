<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use App\Services\PlayerSessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class PlayerSessionServiceTest extends TestCase
{
    use RefreshDatabase;

    private PlayerSessionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PlayerSessionService();
    }

    public function test_creates_guest_player_when_no_session(): void
    {
        $request = Request::create('/');
        $request->setLaravelSession(app('session.store'));

        $player = $this->service->resolveOrCreatePlayer($request);

        $this->assertNotNull($player);
        $this->assertNotNull($player->user);
        $this->assertEquals('Guest', $player->user->name);
        $this->assertStringContainsString('@guest.local', $player->user->email);
        $this->assertEquals($player->getKey(), $request->session()->get('player_id'));
    }

    public function test_returns_existing_player_from_session(): void
    {
        $existing = Player::factory()->create();

        $request = Request::create('/');
        $request->setLaravelSession(app('session.store'));
        $request->session()->put('player_id', $existing->getKey());

        $player = $this->service->resolveOrCreatePlayer($request);

        $this->assertEquals($existing->getKey(), $player->getKey());
    }

    public function test_creates_new_player_when_session_player_is_deleted(): void
    {
        $request = Request::create('/');
        $request->setLaravelSession(app('session.store'));
        $request->session()->put('player_id', 'nonexistent-id');

        $player = $this->service->resolveOrCreatePlayer($request);

        $this->assertNotNull($player);
        $this->assertEquals('Guest', $player->user->name);
        $this->assertNotEquals('nonexistent-id', $player->getKey());
    }

    public function test_resolve_active_game_returns_null_when_no_session(): void
    {
        $player = Player::factory()->create();

        $request = Request::create('/');
        $request->setLaravelSession(app('session.store'));

        [$game, $roundData] = $this->service->resolveActiveGame($request, $player);

        $this->assertNull($game);
        $this->assertNull($roundData);
    }

    public function test_resolve_active_game_returns_game_data(): void
    {
        $this->setupMap();
        $game = Game::factory()->inProgress()->create();
        $location = $game->map->locations()->first();
        $round = Round::create([
            'game_id' => $game->getKey(),
            'round_number' => 1,
            'location_lat' => $location->lat,
            'location_lng' => $location->lng,
            'location_heading' => $location->heading ?? 0,
            'started_at' => now(),
        ]);
        $player = $game->playerOne;

        $request = Request::create('/');
        $request->setLaravelSession(app('session.store'));
        $request->session()->put('game_id', $game->getKey());

        [$gameData, $roundData] = $this->service->resolveActiveGame($request, $player);

        $this->assertNotNull($gameData);
        $this->assertNotNull($roundData);
        $this->assertEquals($game->getKey(), $gameData['id']);
        $this->assertEquals($round->getKey(), $roundData['round_id']);
    }

    public function test_resolve_active_game_clears_session_for_completed_game(): void
    {
        $this->setupMap();
        $game = Game::factory()->completed()->create();
        $player = $game->playerOne;

        $request = Request::create('/');
        $request->setLaravelSession(app('session.store'));
        $request->session()->put('game_id', $game->getKey());

        [$gameData, $roundData] = $this->service->resolveActiveGame($request, $player);

        $this->assertNull($gameData);
        $this->assertNull($roundData);
        $this->assertNull($request->session()->get('game_id'));
    }

    public function test_resolve_active_game_clears_session_for_non_participant(): void
    {
        $this->setupMap();
        $game = Game::factory()->inProgress()->create();
        $outsider = Player::factory()->create();

        $request = Request::create('/');
        $request->setLaravelSession(app('session.store'));
        $request->session()->put('game_id', $game->getKey());

        [$gameData, $roundData] = $this->service->resolveActiveGame($request, $outsider);

        $this->assertNull($gameData);
        $this->assertNull($roundData);
        $this->assertNull($request->session()->get('game_id'));
    }
}
