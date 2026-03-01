<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Http\JsonResponse;

class GetPlayerStats extends Controller
{
    public function __invoke(Player $player): JsonResponse
    {
        $completedGames = Game::query()
            ->where('status', GameStatus::Completed)
            ->where(function ($query) use ($player) {
                $query->where('player_one_id', $player->getKey())
                    ->orWhere('player_two_id', $player->getKey());
            });

        $wins = (clone $completedGames)->where('winner_id', $player->getKey())->count();
        $draws = (clone $completedGames)->whereNull('winner_id')->count();
        $totalCompleted = $completedGames->count();
        $losses = $totalCompleted - $wins - $draws;

        $recentMatches = Game::query()
            ->with(['playerOne', 'playerTwo'])
            ->where('status', GameStatus::Completed)
            ->where(function ($query) use ($player) {
                $query->where('player_one_id', $player->getKey())
                    ->orWhere('player_two_id', $player->getKey());
            })
            ->latest()
            ->limit(10)
            ->get()
            ->map(function (Game $game) use ($player) {
                $isPlayerOne = $game->player_one_id === $player->getKey();
                $opponent = $isPlayerOne ? $game->playerTwo : $game->playerOne;

                if ($game->winner_id === null) {
                    $result = 'draw';
                } elseif ($game->winner_id === $player->getKey()) {
                    $result = 'win';
                } else {
                    $result = 'loss';
                }

                return [
                    'game_id' => $game->getKey(),
                    'opponent_name' => $opponent->name,
                    'result' => $result,
                    'played_at' => $game->created_at->toIso8601String(),
                ];
            });

        return response()->json([
            'wins' => $wins,
            'losses' => $losses,
            'draws' => $draws,
            'elo' => $player->elo_rating,
            'recent_matches' => $recentMatches,
        ]);
    }
}
