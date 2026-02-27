<?php

use App\Http\Controllers\DeclineRematch;
use App\Http\Controllers\JoinQueue;
use App\Http\Controllers\PlayerLeavesQueue;
use App\Http\Controllers\PlayerMakesGuess;
use App\Http\Controllers\RememberGameSession;
use App\Http\Controllers\RequestRematch;
use App\Http\Controllers\SendMessage;
use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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

    $game = null;
    $roundData = null;

    $gameId = $request->session()->get('game_id');
    if ($gameId) {
        $gameModel = Game::query()
            ->with(['playerOne.user', 'playerTwo.user'])
            ->find($gameId);

        if ($gameModel
            && $gameModel->status === GameStatus::InProgress
            && in_array($player->getKey(), [$gameModel->player_one_id, $gameModel->player_two_id], true)
        ) {
            $game = [
                'id' => $gameModel->getKey(),
                'player_one' => [
                    'id' => $gameModel->player_one_id,
                    'user' => ['name' => $gameModel->playerOne->user->name],
                    'elo_rating' => $gameModel->playerOne->elo_rating,
                    'rank' => $gameModel->playerOne->rank,
                ],
                'player_two' => [
                    'id' => $gameModel->player_two_id,
                    'user' => ['name' => $gameModel->playerTwo->user->name],
                    'elo_rating' => $gameModel->playerTwo->elo_rating,
                    'rank' => $gameModel->playerTwo->rank,
                ],
                'player_one_health' => $gameModel->player_one_health,
                'player_two_health' => $gameModel->player_two_health,
            ];

            $round = $gameModel->rounds()
                ->whereNull('finished_at')
                ->orderByDesc('round_number')
                ->first();

            if ($round) {
                $roundData = [
                    'game_id' => $gameModel->getKey(),
                    'round_id' => $round->getKey(),
                    'round_number' => $round->round_number,
                    'player_one_health' => $gameModel->player_one_health,
                    'player_two_health' => $gameModel->player_two_health,
                    'location_lat' => $round->location_lat,
                    'location_lng' => $round->location_lng,
                    'location_heading' => $round->location_heading,
                    'started_at' => optional($round->started_at)->toISOString(),
                    'player_one_locked_in' => $round->player_one_locked_in,
                    'player_two_locked_in' => $round->player_two_locked_in,
                ];
            }
        } else {
            $request->session()->forget('game_id');
        }
    }

    return Inertia::render('welcome', [
        'player' => array_merge($player->toArray(), [
            'user' => $player->user->toArray(),
            'elo_rating' => $player->elo_rating,
            'rank' => $player->rank,
        ]),
        'queue_count' => count(Cache::get('matchmaking_queue', [])),
        'game' => $game,
        'round_data' => $roundData,
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
Route::post('players/{player}/games/{game}/remember', RememberGameSession::class)
    ->name('games.remember');
Route::post('players/{player}/games/{game}/rematch', RequestRematch::class)
    ->name('games.rematch');
Route::post('players/{player}/games/{game}/decline-rematch', DeclineRematch::class)
    ->name('games.decline-rematch');

Route::get('leaderboard', function () {
    $entries = \App\Models\PlayerStats::query()
        ->where('games_played', '>=', 3)
        ->orderByDesc('games_won')
        ->limit(50)
        ->with('player.user')
        ->get()
        ->map(fn ($s) => [
            'player_id' => $s->player_id,
            'player_name' => $s->player?->user?->name ?? $s->player?->name ?? 'Unknown',
            'games_won' => $s->games_won,
            'games_played' => $s->games_played,
            'win_rate' => $s->win_rate,
            'best_win_streak' => $s->best_win_streak,
            'elo_rating' => $s->player?->elo_rating ?? 1000,
            'rank' => $s->player?->rank ?? 'Bronze',
        ]);

    return response()->json($entries);
});

Route::get('players/{player}/stats', function (\App\Models\Player $player) {
    $stats = $player->stats;
    if (! $stats) {
        return response()->json([
            'games_played' => 0, 'games_won' => 0, 'games_lost' => 0,
            'total_rounds' => 0, 'total_score' => 0, 'best_round_score' => 0,
            'total_damage_dealt' => 0, 'total_damage_taken' => 0,
            'current_win_streak' => 0, 'best_win_streak' => 0,
            'perfect_rounds' => 0, 'closest_guess_km' => null,
            'total_distance_km' => 0, 'total_guesses_made' => 0,
            'total_guesses_missed' => 0, 'win_rate' => 0,
            'average_score' => 0, 'average_distance_km' => 0,
            'elo_rating' => $player->elo_rating,
            'rank' => $player->rank,
        ]);
    }

    return response()->json(array_merge($stats->toArray(), [
        'win_rate' => $stats->win_rate,
        'average_score' => $stats->average_score,
        'average_distance_km' => $stats->average_distance_km,
        'elo_rating' => $player->elo_rating,
        'rank' => $player->rank,
    ]));
});

Route::get('stats', function () {
    return response()->json([
        'games_in_progress' => Game::query()->where('status', 'in_progress')->count(),
        'rounds_played' => Round::query()->whereNotNull('finished_at')->count(),
        'total_players' => Player::query()->count(),
        'queue_count' => count(Cache::get('matchmaking_queue', [])),
    ]);
});

require __DIR__.'/settings.php';
