<?php

namespace App\Http\Controllers;

use App\CacheKeys;
use App\Services\PlayerSessionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(Request $request, PlayerSessionService $playerSession): Response
    {
        $player = $playerSession->resolveOrCreatePlayer($request);

        [$game, $roundData] = $playerSession->resolveActiveGame($request, $player);

        return Inertia::render('welcome', [
            'player' => array_merge($player->toArray(), [
                'user' => $player->user->toArray(),
                'elo_rating' => $player->elo_rating,
                'rank' => $player->rank,
            ]),
            'queue_count' => count(Cache::get(CacheKeys::MATCHMAKING_QUEUE, [])),
            'game' => $game,
            'round_data' => $roundData,
        ]);
    }
}
