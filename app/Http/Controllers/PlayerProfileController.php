<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\PlayerAchievement;
use Illuminate\Http\JsonResponse;

class PlayerProfileController extends Controller
{
    public function __invoke(Player $player): JsonResponse
    {
        $player->load('user', 'stats');

        $stats = $player->stats;
        $eloHistory = $player->eloHistory()->limit(30)->get()->map(fn ($e) => [
            'elo' => $e->elo_after,
            'date' => $e->created_at->toDateString(),
        ]);

        // Win rate by map
        $winsByMap = Game::query()
            ->where('status', GameStatus::Completed)
            ->where('winner_id', $player->getKey())
            ->with('map')
            ->get()
            ->groupBy('map_id')
            ->map(fn ($games) => [
                'map_name' => $games->first()->map?->display_name ?? $games->first()->map?->name ?? 'Unknown',
                'wins' => $games->count(),
            ])
            ->values();

        // Total games by map
        $gamesByMap = Game::query()
            ->where('status', GameStatus::Completed)
            ->where(fn ($q) => $q->where('player_one_id', $player->getKey())
                ->orWhere('player_two_id', $player->getKey()))
            ->get()
            ->groupBy('map_id')
            ->map->count();

        $mapStats = $winsByMap->map(function ($entry) use ($gamesByMap) {
            $mapId = Game::where('winner_id', '!=', null)
                ->whereHas('map', fn ($q) => $q->where('display_name', $entry['map_name'])
                    ->orWhere('name', $entry['map_name']))
                ->value('map_id');

            $total = $gamesByMap->get($mapId, 0);

            return array_merge($entry, [
                'total_games' => $total,
                'win_rate' => $total > 0 ? round($entry['wins'] / $total * 100, 1) : 0,
            ]);
        });

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
