<?php

use App\Http\Controllers\JoinQueue;
use App\Http\Controllers\PlayerLeavesQueue;
use App\Http\Controllers\PlayerMakesGuess;
use App\Http\Controllers\SendMessage;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function (Request $request) {
    $playerId = $request->session()->get('player_id');
    $player = $playerId ? Player::with('user')->find($playerId) : null;

    if (! $player) {
        $player = Player::factory()
            ->for(User::factory()->create(['name' => 'Guest']))
            ->create(['name' => null]);
        $request->session()->put('player_id', $player->getKey());
        $player->load('user');
    }

    return Inertia::render('welcome', [
        'player' => $player,
        'queue_count' => count(Cache::get('matchmaking_queue', [])),
        'game' => null,
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::post('players/{player}/leave-queue', PlayerLeavesQueue::class)
    ->name('players.leave-queue');
Route::post('players/{player}/join-queue', JoinQueue::class)
    ->name('players.join-queue');

Route::post('players/{player}/games/{game}/rounds/{round}/guess', PlayerMakesGuess::class)
    ->name('games.rounds.guess');
Route::post('players/{player}/games/{game}/send-message', SendMessage::class)
    ->name('games.send-message');

Route::get('stats', function () {
    return response()->json([
        'games_in_progress' => Game::query()->where('status', 'in_progress')->count(),
        'rounds_played' => Round::query()->whereNotNull('finished_at')->count(),
        'total_players' => Player::query()->count(),
    ]);
});

require __DIR__.'/settings.php';
