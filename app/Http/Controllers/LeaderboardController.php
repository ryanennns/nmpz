<?php

namespace App\Http\Controllers;

use App\CacheKeys;
use App\Models\PlayerStats;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class LeaderboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $entries = Cache::remember(CacheKeys::LEADERBOARD_MAIN, 300, function () {
            return PlayerStats::query()
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
        });

        return response()->json($entries);
    }
}
