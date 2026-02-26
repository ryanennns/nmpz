<?php

use App\Http\Controllers\PlayerLeavesQueue;
use App\Http\Controllers\PlayerMakesGuess;
use App\Http\Controllers\PlayerUpdatesGuess;
use App\Http\Controllers\JoinQueue;
use App\Http\Controllers\SendMessage;
use App\Models\Player;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $player = Player::factory()
        ->for(User::factory()->create(['name' => 'Guest']))
        ->create(['name' => null]);

    return Inertia::render('welcome', [
        'player' => $player->load('user'),
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
Route::post('players/{player}/games/{game}/rounds/{round}/guess-preview', PlayerUpdatesGuess::class)
    ->name('games.rounds.guess-preview');
Route::post('players/{player}/games/{game}/send-message', SendMessage::class)
    ->name('games.send-message');

require __DIR__.'/settings.php';
