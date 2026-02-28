<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class StatsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'games_in_progress' => Game::query()->where('status', 'in_progress')->count(),
            'rounds_played' => Round::query()->whereNotNull('finished_at')->count(),
            'total_players' => Player::query()->count(),
            'queue_count' => count(Cache::get('matchmaking_queue', [])),
        ]);
    }
}
