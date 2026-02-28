<?php

use App\Http\Controllers\JoinQueue;
use App\Http\Controllers\PlayerLeavesQueue;
use App\Http\Controllers\PlayerMakesGuess;
use App\Http\Controllers\RememberGameSession;
use App\Http\Controllers\SendMessage;
use App\Http\Controllers\UpdatePlayer;
use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Str;

Route::get('/', function (Request $request) {
    $playerId = $request->session()->get('player_id');
    $player = $playerId ? Player::with('user')->find($playerId) : null;

    if (! $player) {
        $user = User::query()->create([
            'name' => 'Guest',
            'email' => Str::uuid().'@guest.local',
            'password' => Hash::make(Str::random(32)),
        ]);
        $player = Player::query()->create([
            'user_id' => $user->getKey(),
            'name' => null,
        ]);
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
                ],
                'player_two' => [
                    'id' => $gameModel->player_two_id,
                    'user' => ['name' => $gameModel->playerTwo->user->name],
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
                    'location_image_id' => $round->location_image_id,
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
        'player' => $player,
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
