<?php

namespace App\Http\Controllers;

use App\Models\Season;
use App\Models\SeasonResult;
use Illuminate\Http\JsonResponse;

class SeasonController extends Controller
{
    public function current(): JsonResponse
    {
        $season = Season::current();

        if (! $season) {
            return response()->json(['season' => null]);
        }

        return response()->json([
            'season' => [
                'season_number' => $season->season_number,
                'start_date' => $season->start_date->toDateString(),
                'end_date' => $season->end_date->toDateString(),
                'days_remaining' => max(0, today()->diffInDays($season->end_date, false)),
            ],
        ]);
    }

    public function leaderboard(Season $season): JsonResponse
    {
        $results = SeasonResult::query()
            ->where('season_id', $season->getKey())
            ->with('player.user')
            ->orderByDesc('peak_elo')
            ->limit(100)
            ->get()
            ->map(fn (SeasonResult $r) => [
                'player_name' => $r->player?->user?->name ?? 'Unknown',
                'player_id' => $r->player_id,
                'peak_elo' => $r->peak_elo,
                'final_elo' => $r->final_elo,
                'peak_rank' => $r->peak_rank,
                'games_played' => $r->games_played,
                'games_won' => $r->games_won,
            ]);

        return response()->json([
            'season_number' => $season->season_number,
            'results' => $results,
        ]);
    }

    public function history(): JsonResponse
    {
        $seasons = Season::query()
            ->where('is_active', false)
            ->orderByDesc('season_number')
            ->limit(12)
            ->get()
            ->map(fn (Season $s) => [
                'id' => $s->getKey(),
                'season_number' => $s->season_number,
                'start_date' => $s->start_date->toDateString(),
                'end_date' => $s->end_date->toDateString(),
            ]);

        return response()->json($seasons);
    }
}
