<?php

use App\Events\GameReady;
use App\Events\RoundStarted;
use App\Http\Controllers\PlayerLeavesQueue;
use App\Http\Controllers\PlayerMakesGuess;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\Round;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $player = Player::factory()
        ->for(User::factory()->create(['name' => 'Player ' . strtoupper(substr(md5(uniqid()), 0, 4))]))
        ->create();

    $queue = Cache::get('matchmaking_queue', []);
    $queuedPlayerId = array_shift($queue);
    $queuedPlayer = $queuedPlayerId ? Player::query()->find($queuedPlayerId) : null;

    if ($queuedPlayer) {
        Cache::put('matchmaking_queue', $queue, now()->addMinutes(5));

        $map = Map::query()->firstOrFail();
        $locationCount = Location::query()->where('map_id', $map->getKey())->count();
        $seed = random_int(0, $locationCount - 1);

        $game = Game::factory()->inProgress()->create([
            'player_one_id' => $queuedPlayer->getKey(),
            'player_two_id' => $player->getKey(),
            'map_id' => $map->getKey(),
            'seed' => $seed,
        ]);

        $location = Location::query()->where('map_id', $map->getKey())
            ->orderBy('id')
            ->offset($seed % $locationCount)
            ->firstOrFail();

        $round = Round::factory()->for($game)->create([
            'round_number' => 1,
            'location_lat' => $location->lat,
            'location_lng' => $location->lng,
            'location_heading' => $location->heading,
        ]);

        $game->load(['playerOne.user', 'playerTwo.user']);

        GameReady::dispatch($game, $queuedPlayer);

        $p1Health = $game->player_one_health;
        $p2Health = $game->player_two_health;
        dispatch(function () use ($round, $p1Health, $p2Health) {
            $round->forceFill(['started_at' => now()])->save();
            RoundStarted::dispatch($round, $p1Health, $p2Health);
            ForceEndRound::dispatch($round->getKey())->delay(now()->addSeconds(60));
        })->delay(now()->addSeconds(2));

        return Inertia::render('welcome', [
            'player' => $player->load('user'),
            'game' => $game,
        ]);
    }

    $queue[] = $player->getKey();
    Cache::put('matchmaking_queue', $queue, now()->addMinutes(5));

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

Route::post('players/{player}/games/{game}/rounds/{round}/guess', PlayerMakesGuess::class)
    ->name('games.rounds.guess');

require __DIR__.'/settings.php';
