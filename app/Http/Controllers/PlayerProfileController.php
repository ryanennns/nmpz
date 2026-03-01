<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\PlayerAchievement;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PlayerProfileController extends Controller
{
    public function __invoke(Player $player): JsonResponse
    {
        $player->load('user', 'stats');

        $stats = $player->stats;
        $eloHistory = $player->eloHistory()
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(fn ($e) => [
                'elo' => $e->rating_after,
                'date' => $e->created_at->toDateString(),
            ]);

        // Map stats in two aggregate queries instead of loading all games
        $playerId = $player->getKey();

        $mapStats = DB::table('games')
            ->join('maps', 'maps.id', '=', 'games.map_id')
            ->where('games.status', GameStatus::Completed->value)
            ->where(fn ($q) => $q->where('player_one_id', $playerId)->orWhere('player_two_id', $playerId))
            ->groupBy('games.map_id', 'maps.display_name', 'maps.name')
            ->select([
                'games.map_id',
                DB::raw('COALESCE(maps.display_name, maps.name, \'Unknown\') as map_name'),
                DB::raw('COUNT(*) as total_games'),
                DB::raw("SUM(CASE WHEN games.winner_id = '{$playerId}' THEN 1 ELSE 0 END) as wins"),
            ])
            ->get()
            ->map(fn ($row) => [
                'map_name' => $row->map_name,
                'wins' => (int) $row->wins,
                'total_games' => (int) $row->total_games,
                'win_rate' => $row->total_games > 0 ? round($row->wins / $row->total_games * 100, 1) : 0,
            ]);

        $achievements = PlayerAchievement::query()
            ->where('player_id', $player->getKey())
            ->with('achievement')
            ->orderByDesc('earned_at')
            ->limit(6)
            ->get()
            ->map(fn ($pa) => [
                'key' => $pa->achievement->key,
                'name' => $pa->achievement->name,
                'icon' => $pa->achievement->icon,
                'earned_at' => $pa->earned_at->toIso8601String(),
            ]);

        return response()->json([
            'player_id' => $player->getKey(),
            'name' => $player->user?->name ?? 'Unknown',
            'elo_rating' => $player->elo_rating,
            'rank' => $player->rank,
            'stats' => [
                'games_played' => $stats?->games_played ?? 0,
                'games_won' => $stats?->games_won ?? 0,
                'win_rate' => $stats?->win_rate ?? 0,
                'best_win_streak' => $stats?->best_win_streak ?? 0,
                'best_round_score' => $stats?->best_round_score ?? 0,
                'average_score' => $stats?->average_score ?? 0,
            ],
            'elo_history' => $eloHistory,
            'achievements' => $achievements,
            'map_stats' => $mapStats->values(),
        ]);
    }
}
