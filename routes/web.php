<?php

use App\Http\Controllers\PlayerMakesGuess;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    $game = Game::with(['playerOne.user', 'playerTwo.user'])->latest()->first();

    if (! $game) {
        $playerOne = Player::factory()
            ->for(User::factory()->create(['name' => 'Player One']))
            ->create();

        $playerTwo = Player::factory()
            ->for(User::factory()->create(['name' => 'Player Two']))
            ->create();

        $game = Game::factory()->inProgress()->create([
            'player_one_id' => $playerOne->getKey(),
            'player_two_id' => $playerTwo->getKey(),
        ]);

        Round::factory()->for($game)->create(['round_number' => 1]);

        $game->load(['playerOne.user', 'playerTwo.user']);
    }

    return Inertia::render('welcome', [
        'game' => $game,
        'round' => $game->rounds()->latest()->first(),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::post('players/{player}/games/{game}/rounds/{round}/guess', PlayerMakesGuess::class)
    ->name('games.rounds.guess');

require __DIR__.'/settings.php';
