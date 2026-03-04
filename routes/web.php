<?php

use App\Http\Controllers\ClaimPlayer;
use App\Http\Controllers\CreatePlayer;
use App\Http\Controllers\GetSoloGameRound;
use App\Http\Controllers\SingleplayerPageController;
use App\Http\Controllers\StartSoloGame;
use App\Http\Controllers\SoloGameGuess;
use App\Http\Controllers\GameSummaryController;
use App\Http\Controllers\GetAuthPlayer;
use App\Http\Controllers\GetGame;
use App\Http\Controllers\GetLocationReports;
use App\Http\Controllers\GetPlayer;
use App\Http\Controllers\GetPlayerStats;
use App\Http\Controllers\HomePageController;
use App\Http\Controllers\JoinQueue;
use App\Http\Controllers\LeaveQueue;
use App\Http\Controllers\PlayerMakesGuess;
use App\Http\Controllers\ReportLocation;
use App\Http\Controllers\SendMessage;
use App\Http\Controllers\UpdatePlayer;
use App\Http\Controllers\VoteOnLocationReport;
use App\Http\Controllers\WaitingRoomStats;
use Illuminate\Support\Facades\Route;

Route::get('/', HomePageController::class);

Route::prefix('singleplayer')->middleware('player.user')->group(function () {
    Route::post('/games', StartSoloGame::class)->middleware('player.user');
    Route::get('/{soloGame}', SingleplayerPageController::class);
    Route::post('/{soloGame}/round', GetSoloGameRound::class)->middleware('player.user');
    Route::post('/{soloGame}/guess', SoloGameGuess::class)->middleware('player.user');
});

Route::prefix('games')->group(function () {
    Route::middleware('player.user')->get('/{game}', GetGame::class);
    Route::get('/{game}/summary', GameSummaryController::class);
});

Route::prefix('players')->name('players')->group(function () {
    Route::post('/', CreatePlayer::class)->name('.create');
    Route::middleware('player.user')->group(function () {
        Route::get('/{player}', GetPlayer::class)->middleware('player.user')->name('.get');
        Route::post('/{player}/join-queue', JoinQueue::class)
            ->name('.join-queue');
        Route::post('/{player}/leave-queue', LeaveQueue::class)
            ->name('.leave-queue');
        Route::patch('/{player}', UpdatePlayer::class)
            ->name('.update');
        Route::get('/{player}/stats', GetPlayerStats::class)
            ->name('.stats');
        Route::post('/{player}/claim', ClaimPlayer::class)
            ->name('.claim');
        Route::post('/{player}/games/{game}/rounds/{round}/guess', PlayerMakesGuess::class)
            ->name('.games.rounds.guess');
        Route::post('/{player}/games/{game}/send-message', SendMessage::class)
            ->name('.games.send-message');
    });
});

Route::middleware('auth')->get('/auth/player', GetAuthPlayer::class);

Route::get('stats', WaitingRoomStats::class);

Route::middleware('auth')->group(function () {
    Route::get('locations/reports', GetLocationReports::class)
        ->name('locations.reports');
    Route::post('locations/{location}/report', ReportLocation::class)
        ->name('locations.report');
    Route::post('location-reports/{locationReport}/vote', VoteOnLocationReport::class)
        ->name('location-reports.vote');
});

require __DIR__.'/settings.php';
