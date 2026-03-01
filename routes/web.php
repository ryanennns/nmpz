<?php

use App\Http\Controllers\CancelPrivateLobby;
use App\Http\Controllers\CreatePrivateLobby;
use App\Http\Controllers\DailyChallengeController;
use App\Http\Controllers\DeclineRematch;
use App\Http\Controllers\FeaturedMatchController;
use App\Http\Controllers\FriendshipController;
use App\Http\Controllers\GameHistoryController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\JoinPrivateLobby;
use App\Http\Controllers\JoinQueue;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\LiveGamesController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\PlayerAchievementsController;
use App\Http\Controllers\PlayerLeavesQueue;
use App\Http\Controllers\PlayerMakesGuess;
use App\Http\Controllers\PlayerProfileController;
use App\Http\Controllers\PlayerStatsController;
use App\Http\Controllers\RememberGameSession;
use App\Http\Controllers\ReplayController;
use App\Http\Controllers\RequestRematch;
use App\Http\Controllers\SeasonController;
use App\Http\Controllers\SendMessage;
use App\Http\Controllers\SendReaction;
use App\Http\Controllers\SendSpectatorChat;
use App\Http\Controllers\SoloGameController;
use App\Http\Controllers\SpectateGame;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\UpdatePlayer;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

// ─── Player actions ───
Route::post('players/{player}/leave-queue', PlayerLeavesQueue::class)->name('players.leave-queue');
Route::post('players/{player}/join-queue', JoinQueue::class)->name('players.join-queue');
Route::patch('players/{player}', UpdatePlayer::class)->name('players.update');

// ─── Multiplayer game ───
Route::middleware('game.player')->group(function () {
    Route::post('players/{player}/games/{game}/rounds/{round}/guess', PlayerMakesGuess::class)->name('games.rounds.guess');
    Route::post('players/{player}/games/{game}/send-message', SendMessage::class)->name('games.send-message');
    Route::post('players/{player}/games/{game}/remember', RememberGameSession::class)->name('games.remember');
    Route::post('players/{player}/games/{game}/rematch', RequestRematch::class)->name('games.rematch');
    Route::post('players/{player}/games/{game}/decline-rematch', DeclineRematch::class)->name('games.decline-rematch');
    Route::post('players/{player}/games/{game}/reaction', SendReaction::class);
});

// ─── Solo play ───
Route::prefix('players/{player}/solo')->group(function () {
    Route::post('start', [SoloGameController::class, 'start'])->name('solo.start');
    Route::post('{solo_game}/guess', [SoloGameController::class, 'guess'])->name('solo.guess');
    Route::post('{solo_game}/abandon', [SoloGameController::class, 'abandon'])->name('solo.abandon');
    Route::get('personal-bests', [SoloGameController::class, 'personalBests'])->name('solo.personal-bests');
    Route::get('stats', [SoloGameController::class, 'stats'])->name('solo.stats');
});
Route::get('solo/leaderboard', [SoloGameController::class, 'leaderboard'])->name('solo.leaderboard');

// ─── Daily challenge ───
Route::prefix('players/{player}/daily-challenge')->group(function () {
    Route::post('start', [DailyChallengeController::class, 'start'])->name('daily-challenge.start');
    Route::post('{entry}/guess', [DailyChallengeController::class, 'guess'])->name('daily-challenge.guess');
    Route::post('reset', [DailyChallengeController::class, 'reset'])->name('daily-challenge.reset');
    Route::get('stats', [DailyChallengeController::class, 'stats'])->name('daily-challenge.stats');
});
Route::get('daily-challenge', [DailyChallengeController::class, 'today'])->name('daily-challenge.today');
Route::get('daily-challenge/leaderboard', [DailyChallengeController::class, 'leaderboard'])->name('daily-challenge.leaderboard');

// ─── Friends ───
Route::prefix('players/{player}/friends')->group(function () {
    Route::get('/', [FriendshipController::class, 'index'])->name('friends.index');
    Route::post('/', [FriendshipController::class, 'send'])->name('friends.send');
    Route::get('pending', [FriendshipController::class, 'pending'])->name('friends.pending');
    Route::post('{friendship}/accept', [FriendshipController::class, 'accept'])->name('friends.accept');
    Route::post('{friendship}/decline', [FriendshipController::class, 'decline'])->name('friends.decline');
    Route::delete('{friendship}', [FriendshipController::class, 'remove'])->name('friends.remove');
});

// ─── Private lobbies ───
Route::post('players/{player}/private-lobby', CreatePrivateLobby::class)->name('private-lobby.create');
Route::post('players/{player}/private-lobby/join', JoinPrivateLobby::class)->name('private-lobby.join');
Route::post('players/{player}/private-lobby/{private_lobby}/cancel', CancelPrivateLobby::class)->name('private-lobby.cancel');

// ─── Seasons ───
Route::get('seasons/current', [SeasonController::class, 'current'])->name('seasons.current');
Route::get('seasons/{season}/leaderboard', [SeasonController::class, 'leaderboard'])->name('seasons.leaderboard');
Route::get('seasons/history', [SeasonController::class, 'history'])->name('seasons.history');

// ─── Player info ───
Route::get('players/{player}/stats', PlayerStatsController::class)->name('players.stats');
Route::get('players/{player}/games', [GameHistoryController::class, 'index'])->name('players.games');
Route::get('players/{player}/achievements', PlayerAchievementsController::class)->name('players.achievements');
Route::get('players/{player}/profile', PlayerProfileController::class)->name('players.profile');

// ─── Global ───
Route::get('maps', MapController::class)->name('maps.index');
Route::get('leaderboard', LeaderboardController::class)->name('leaderboard');
Route::get('stats', StatsController::class)->name('stats');
Route::get('games/live', LiveGamesController::class)->name('games.live');
Route::get('games/featured', FeaturedMatchController::class)->name('games.featured');
Route::get('games/{game}/history', [GameHistoryController::class, 'show'])->name('games.history');
Route::get('games/{game}/spectate', SpectateGame::class)->name('games.spectate');
Route::get('games/{game}/replay', ReplayController::class)->name('games.replay');
Route::post('games/{game}/spectator-chat', SendSpectatorChat::class)->name('games.spectator-chat');

require __DIR__.'/settings.php';
