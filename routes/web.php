<?php

use App\Http\Controllers\ClaimPlayer;
use App\Http\Controllers\CreatePlayer;
use App\Http\Controllers\GameSummaryController;
use App\Http\Controllers\GetAuthPlayer;
use App\Http\Controllers\GetGame;
use App\Http\Controllers\GetPlayer;
use App\Http\Controllers\GetPlayerStats;
use App\Http\Controllers\HomePageController;
use App\Http\Controllers\JoinQueue;
use App\Http\Controllers\PlayerLeavesQueue;
use App\Http\Controllers\PlayerMakesGuess;
use App\Http\Controllers\SendMessage;
use App\Http\Controllers\UpdatePlayer;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;

Route::get('/', HomePageController::class);

Route::prefix('games')->group(function () {
    Route::get('/{game}', GetGame::class);
    Route::get('/{game}/summary', GameSummaryController::class);
});

Route::prefix('players')->name('players')->group(function () {
    Route::post('/', CreatePlayer::class)->name('.create');
    Route::get('/{player}', GetPlayer::class)->name('.get');
    Route::post('/{player}/join-queue', JoinQueue::class)
        ->name('.join-queue');
    Route::post('/{player}/leave-queue', PlayerLeavesQueue::class)
        ->name('.leave-queue');
    Route::patch('/{player}', UpdatePlayer::class)
        ->name('.update');
    Route::get('/{player}/stats', GetPlayerStats::class)
        ->name('.stats');
    Route::post('/{player}/claim', ClaimPlayer::class);
});

Route::post('players/{player}/games/{game}/rounds/{round}/guess', PlayerMakesGuess::class)
    ->name('games.rounds.guess');
Route::post('players/{player}/games/{game}/send-message', SendMessage::class)
    ->name('games.send-message');

Route::middleware('auth')->get('/auth/player', GetAuthPlayer::class);

Route::get('stats', function () {
    return response()->json([
        'games_in_progress' => Game::query()->where('status', 'in_progress')->count(),
        'rounds_played' => Round::query()->whereNotNull('finished_at')->count(),
        'total_players' => Player::query()->count(),
        'queue_count' => count(Cache::get('matchmaking_queue', [])),
    ]);
});

require __DIR__.'/settings.php';
