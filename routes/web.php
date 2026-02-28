<?php

use App\Enums\GameStatus;
use App\Http\Controllers\GameController;
use App\Http\Controllers\GetPlayer;
use App\Http\Controllers\HomePageController;
use App\Http\Controllers\JoinQueue;
use App\Http\Controllers\PlayerLeavesQueue;
use App\Http\Controllers\PlayerMakesGuess;
use App\Http\Controllers\RememberGameSession;
use App\Http\Controllers\SendMessage;
use App\Http\Controllers\UpdatePlayer;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Location;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', HomePageController::class);
Route::get('/game', GameController::class)->name('home');

Route::post('players', function (Illuminate\Http\Request $request) {
    $validated = $request->validate([
        'name' => 'required|string|max:32',
    ]);

    $p = Player::query()->create([
        'name' => $validated['name'],
    ]);

    return response()->json($p->toArray(), 201);
});
Route::get('players/{player}', GetPlayer::class);

Route::get('game/{game}', function (Illuminate\Http\Request $request, Game $game) {
    $validated = $request->validate(['player' => 'required|string|exists:players,id']);
    $player = Player::query()->find($validated['player']);

    if (
        $game->status !== GameStatus::InProgress
        || ! in_array($player->getKey(), [$game->player_one_id, $game->player_two_id], true)
    ) {
        abort(422);
    }

    $gameArray = [
        'id' => $game->getKey(),
        'player_one' => [
            'id' => $game->player_one_id,
            'name' => $game->playerOne?->name,
        ],
        'player_two' => [
            'id' => $game->player_two_id,
            'name' => $game->playerTwo?->name,
        ],
        'player_one_health' => $game->player_one_health,
        'player_two_health' => $game->player_two_health,
    ];

    $count = Location::query()->where('map_id', $game->map_id)->count();
    $offset = ($game->seed) % $count;

    $location = Location::query()->where('map_id', $game->map_id)
        ->orderBy('id')
        ->offset($offset)
        ->firstOrFail();

    $round = $game->rounds()->latest()->first();

    $roundData = [
        'game_id' => $game->getKey(),
        'round_id' => $round->getKey(),
        'round_number' => $round->round_number,
        'player_one_health' => $game->player_one_health,
        'player_two_health' => $game->player_two_health,
        'location_lat' => $location?->lat,
        'location_lng' => $location?->lng,
        'location_heading' => $location?->heading,
        'location_image_id' => $location?->image_id,
        'started_at' => optional($round->started_at)->toISOString(),
        'player_one_locked_in' => $round->player_one_locked_in,
        'player_two_locked_in' => $round->player_two_locked_in,
    ];

    return Inertia::render('welcome', [
        'player' => $player,
        'game' => $gameArray,
        'round_data' => $roundData,
    ]);
});

Route::post('players/{player}/leave-queue', PlayerLeavesQueue::class)
    ->name('players.leave-queue');
Route::post('players/{player}/join-queue', JoinQueue::class)
    ->name('players.join-queue');
Route::patch('players/{player}', UpdatePlayer::class)
    ->name('players.update');

Route::post('players/{player}/games/{game}/rounds/{round}/guess', PlayerMakesGuess::class)
    ->name('games.rounds.guess');
Route::post('players/{player}/games/{game}/send-message', SendMessage::class)
    ->name('games.send-message');
Route::post('players/{player}/games/{game}/remember', RememberGameSession::class)
    ->name('games.remember');

Route::get('stats', function () {
    return response()->json([
        'games_in_progress' => Game::query()->where('status', 'in_progress')->count(),
        'rounds_played' => Round::query()->whereNotNull('finished_at')->count(),
        'total_players' => Player::query()->count(),
        'queue_count' => count(Cache::get('matchmaking_queue', [])),
    ]);
});

require __DIR__.'/settings.php';
