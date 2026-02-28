<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Services\ScoringService;
use Illuminate\Http\JsonResponse;

class ReplayController extends Controller
{
    public function __invoke(Game $game): JsonResponse
    {
        abort_if($game->status !== GameStatus::Completed, 404, 'Game not completed.');

        $game->load(['playerOne.user', 'playerTwo.user', 'map', 'rounds']);

        $rounds = $game->rounds->map(function ($round) {
            return [
                'round_number' => $round->round_number,
                'location_lat' => $round->location_lat,
                'location_lng' => $round->location_lng,
                'location_heading' => $round->location_heading,
                'player_one_guess_lat' => $round->player_one_guess_lat,
                'player_one_guess_lng' => $round->player_one_guess_lng,
                'player_two_guess_lat' => $round->player_two_guess_lat,
                'player_two_guess_lng' => $round->player_two_guess_lng,
                'player_one_score' => $round->player_one_score,
                'player_two_score' => $round->player_two_score,
                'player_one_distance_km' => $round->player_one_guess_lat !== null
                    ? round(ScoringService::haversineDistanceKm(
                        $round->location_lat, $round->location_lng,
                        $round->player_one_guess_lat, $round->player_one_guess_lng,
                    ), 2)
                    : null,
                'player_two_distance_km' => $round->player_two_guess_lat !== null
                    ? round(ScoringService::haversineDistanceKm(
                        $round->location_lat, $round->location_lng,
                        $round->player_two_guess_lat, $round->player_two_guess_lng,
                    ), 2)
                    : null,
            ];
        });

        return response()->json([
            'game_id' => $game->getKey(),
            'player_one' => [
                'id' => $game->player_one_id,
                'name' => $game->playerOne?->user?->name ?? 'Unknown',
                'elo_rating' => $game->playerOne?->elo_rating ?? 1000,
            ],
            'player_two' => [
                'id' => $game->player_two_id,
                'name' => $game->playerTwo?->user?->name ?? 'Unknown',
                'elo_rating' => $game->playerTwo?->elo_rating ?? 1000,
            ],
            'winner_id' => $game->winner_id,
            'match_format' => $game->match_format ?? 'classic',
            'map_name' => $game->map?->display_name ?? $game->map?->name ?? 'Unknown',
            'player_one_total_score' => $game->playerOneScore(),
            'player_two_total_score' => $game->playerTwoScore(),
            'rounds' => $rounds,
        ]);
    }
}
