<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use Illuminate\Http\JsonResponse;

class FeaturedMatchController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $game = Game::query()
            ->where('status', GameStatus::InProgress)
            ->where('allow_spectators', true)
            ->with(['playerOne.user', 'playerTwo.user'])
            ->get()
            ->sortByDesc(function (Game $game) {
                $combinedElo = ($game->playerOne?->elo_rating ?? 1000) + ($game->playerTwo?->elo_rating ?? 1000);

                return $combinedElo + ($game->spectator_count * 100);
            })
            ->first();

        if (! $game) {
            return response()->json(['featured' => null]);
        }

        return response()->json([
            'featured' => [
                'game_id' => $game->getKey(),
                'player_one_name' => $game->playerOne?->user?->name ?? 'Unknown',
                'player_two_name' => $game->playerTwo?->user?->name ?? 'Unknown',
                'player_one_elo' => $game->playerOne?->elo_rating ?? 1000,
                'player_two_elo' => $game->playerTwo?->elo_rating ?? 1000,
                'spectator_count' => $game->spectator_count,
                'match_format' => $game->match_format ?? 'classic',
                'combined_elo' => ($game->playerOne?->elo_rating ?? 1000) + ($game->playerTwo?->elo_rating ?? 1000),
            ],
        ]);
    }
}
