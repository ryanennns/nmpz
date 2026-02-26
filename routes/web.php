<?php

use App\Events\RoundStarted;
use App\Http\Controllers\PlayerMakesGuess;
use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\Round;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $map = Map::firstOrFail();
    $locationCount = Location::where('map_id', $map->getKey())->count();
    $seed = random_int(0, $locationCount - 1);

    $playerOne = Player::factory()
        ->for(User::factory()->create(['name' => 'Player One']))
        ->create();

    $playerTwo = Player::factory()
        ->for(User::factory()->create(['name' => 'Player Two']))
        ->create();

    $game = Game::factory()->inProgress()->create([
        'player_one_id' => $playerOne->getKey(),
        'player_two_id' => $playerTwo->getKey(),
        'map_id' => $map->getKey(),
        'seed' => $seed,
    ]);

    $location = Location::where('map_id', $map->getKey())
        ->orderBy('id')
        ->offset($seed % $locationCount)
        ->firstOrFail();

    $round = Round::factory()->for($game)->create([
        'round_number' => 1,
        'location_lat' => $location->lat,
        'location_lng' => $location->lng,
        'location_heading' => $location->heading,
    ]);

    RoundStarted::dispatch($round, $game->player_one_health, $game->player_two_health);

    $game->load(['playerOne.user', 'playerTwo.user']);

    return Inertia::render('welcome', [
        'game' => $game,
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::post('players/{player}/games/{game}/rounds/{round}/guess', PlayerMakesGuess::class)
    ->name('games.rounds.guess');

require __DIR__.'/settings.php';
