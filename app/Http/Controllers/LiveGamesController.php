<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use Illuminate\Http\JsonResponse;

class LiveGamesController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $games = Game::query()
            ->where('status', GameStatus::InProgress)
            ->where('allow_spectators', true)
            ->with(['playerOne.user', 'playerTwo.user'])
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn (Game $game) => [
                'game_id' => $game->getKey(),
                'player_one_name' => $game->playerOne?->user?->name ?? 'Unknown',
                'player_two_name' => $game->playerTwo?->user?->name ?? 'Unknown',
                'player_one_elo' => $game->playerOne?->elo_rating ?? 1000,
                'player_two_elo' => $game->playerTwo?->elo_rating ?? 1000,
                'spectator_count' => $game->spectator_count,
                'match_format' => $game->match_format ?? 'classic',
                'created_at' => $game->created_at?->toISOString(),
            ]);

        return response()->json($games);
    }
}
