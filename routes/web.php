<?php

use App\Http\Controllers\DeclineRematch;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\JoinQueue;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\PlayerLeavesQueue;
use App\Http\Controllers\PlayerMakesGuess;
use App\Http\Controllers\PlayerStatsController;
use App\Http\Controllers\RememberGameSession;
use App\Http\Controllers\RequestRematch;
use App\Http\Controllers\SendMessage;
use App\Http\Controllers\CancelPrivateLobby;
use App\Http\Controllers\CreatePrivateLobby;
use App\Http\Controllers\GameHistoryController;
use App\Http\Controllers\JoinPrivateLobby;
use App\Http\Controllers\LiveGamesController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\SpectateGame;
use App\Http\Controllers\PlayerAchievementsController;
use App\Http\Controllers\DailyChallengeController;
use App\Http\Controllers\FeaturedMatchController;
use App\Http\Controllers\FriendshipController;
use App\Http\Controllers\PlayerProfileController;
use App\Http\Controllers\ReplayController;
use App\Http\Controllers\SeasonController;
use App\Http\Controllers\SendReaction;
use App\Http\Controllers\SendSpectatorChat;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\UpdatePlayer;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::post('players/{player}/leave-queue', PlayerLeavesQueue::class)
    ->name('players.leave-queue');
Route::post('players/{player}/join-queue', JoinQueue::class)
    ->name('players.join-queue');
Route::patch('players/{player}', UpdatePlayer::class)
    ->name('players.update');

Route::middleware('game.player')->group(function () {
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
});

Route::get('maps', MapController::class);
Route::get('leaderboard', LeaderboardController::class);
Route::get('players/{player}/stats', PlayerStatsController::class);
Route::get('players/{player}/games', [GameHistoryController::class, 'index']);
Route::get('games/{game}/history', [GameHistoryController::class, 'show']);
Route::get('players/{player}/achievements', PlayerAchievementsController::class);
Route::post('players/{player}/private-lobby', CreatePrivateLobby::class);
Route::post('players/{player}/private-lobby/join', JoinPrivateLobby::class);
Route::post('players/{player}/private-lobby/{private_lobby}/cancel', CancelPrivateLobby::class);
Route::get('stats', StatsController::class);
Route::get('games/live', LiveGamesController::class);
Route::get('games/{game}/spectate', SpectateGame::class);
Route::get('daily-challenge', [DailyChallengeController::class, 'today']);
Route::post('players/{player}/daily-challenge/start', [DailyChallengeController::class, 'start']);
Route::post('players/{player}/daily-challenge/{entry}/guess', [DailyChallengeController::class, 'guess']);
Route::get('daily-challenge/leaderboard', [DailyChallengeController::class, 'leaderboard']);
Route::post('players/{player}/daily-challenge/reset', [DailyChallengeController::class, 'reset']);
Route::get('players/{player}/daily-challenge/stats', [DailyChallengeController::class, 'stats']);
Route::get('seasons/current', [SeasonController::class, 'current']);
Route::get('seasons/{season}/leaderboard', [SeasonController::class, 'leaderboard']);
Route::get('seasons/history', [SeasonController::class, 'history']);
Route::get('players/{player}/profile', PlayerProfileController::class);
Route::get('players/{player}/friends', [FriendshipController::class, 'index']);
Route::post('players/{player}/friends', [FriendshipController::class, 'send']);
Route::post('players/{player}/friends/{friendship}/accept', [FriendshipController::class, 'accept']);
Route::post('players/{player}/friends/{friendship}/decline', [FriendshipController::class, 'decline']);
Route::delete('players/{player}/friends/{friendship}', [FriendshipController::class, 'remove']);
Route::get('players/{player}/friends/pending', [FriendshipController::class, 'pending']);
Route::post('players/{player}/games/{game}/reaction', SendReaction::class);
Route::post('games/{game}/spectator-chat', SendSpectatorChat::class);
Route::get('games/featured', FeaturedMatchController::class);
Route::get('games/{game}/replay', ReplayController::class);

require __DIR__.'/settings.php';
