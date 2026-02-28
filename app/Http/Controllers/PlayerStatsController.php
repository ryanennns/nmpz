<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Http\JsonResponse;

class PlayerStatsController extends Controller
{
    public function __invoke(Player $player): JsonResponse
    {
        $stats = $player->stats;
        if (! $stats) {
            return response()->json([
                'games_played' => 0, 'games_won' => 0, 'games_lost' => 0,
                'total_rounds' => 0, 'total_score' => 0, 'best_round_score' => 0,
                'total_damage_dealt' => 0, 'total_damage_taken' => 0,
                'current_win_streak' => 0, 'best_win_streak' => 0,
                'perfect_rounds' => 0, 'closest_guess_km' => null,
                'total_distance_km' => 0, 'total_guesses_made' => 0,
                'total_guesses_missed' => 0, 'win_rate' => 0,
                'average_score' => 0, 'average_distance_km' => 0,
                'elo_rating' => $player->elo_rating,
                'rank' => $player->rank,
            ]);
        }

        return response()->json(array_merge($stats->toArray(), [
            'win_rate' => $stats->win_rate,
            'average_score' => $stats->average_score,
            'average_distance_km' => $stats->average_distance_km,
            'elo_rating' => $player->elo_rating,
            'rank' => $player->rank,
        ]));
    }
}
