<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Services\ScoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameHistoryController extends Controller
{
    public function index(Request $request, Player $player): JsonResponse
    {
        $games = Game::query()
            ->where('status', GameStatus::Completed)
            ->where(fn ($q) => $q->where('player_one_id', $player->getKey())
                ->orWhere('player_two_id', $player->getKey()))
            ->with(['playerOne.user', 'playerTwo.user', 'map'])
            ->orderByDesc('updated_at')
            ->paginate(20);

        $items = $games->getCollection()->map(function (Game $game) use ($player) {
            $isPlayerOne = $game->player_one_id === $player->getKey();
            $opponent = $isPlayerOne ? $game->playerTwo : $game->playerOne;
            $won = $game->winner_id === $player->getKey();
            $draw = $game->winner_id === null;

            return [
                'game_id' => $game->getKey(),
                'opponent_name' => $opponent?->user?->name ?? 'Unknown',
                'opponent_elo' => $opponent?->elo_rating ?? 1000,
                'result' => $draw ? 'draw' : ($won ? 'win' : 'loss'),
                'my_score' => $isPlayerOne ? $game->playerOneScore() : $game->playerTwoScore(),
                'opponent_score' => $isPlayerOne ? $game->playerTwoScore() : $game->playerOneScore(),
                'rating_change' => $isPlayerOne ? $game->player_one_rating_change : $game->player_two_rating_change,
                'map_name' => $game->map?->display_name ?? $game->map?->name ?? 'Unknown',
                'played_at' => $game->updated_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $items,
            'current_page' => $games->currentPage(),
            'last_page' => $games->lastPage(),
        ]);
    }

    public function show(Game $game): JsonResponse
    {
        $game->load(['playerOne.user', 'playerTwo.user', 'map', 'rounds']);

        $rounds = $game->rounds->map(function ($round) {
            return [
                'round_number' => $round->round_number,
                'location_lat' => $round->location_lat,
                'location_lng' => $round->location_lng,
                'player_one_guess_lat' => $round->player_one_guess_lat,
                'player_one_guess_lng' => $round->player_one_guess_lng,
                'player_two_guess_lat' => $round->player_two_guess_lat,
                'player_two_guess_lng' => $round->player_two_guess_lng,
                'player_one_score' => $round->player_one_score,
                'player_two_score' => $round->player_two_score,
                'player_one_distance_km' => $round->player_one_guess_lat !== null
                    ? ScoringService::haversineDistanceKm(
                        $round->location_lat, $round->location_lng,
                        $round->player_one_guess_lat, $round->player_one_guess_lng,
                    )
                    : null,
                'player_two_distance_km' => $round->player_two_guess_lat !== null
                    ? ScoringService::haversineDistanceKm(
                        $round->location_lat, $round->location_lng,
                        $round->player_two_guess_lat, $round->player_two_guess_lng,
                    )
                    : null,
            ];
        });

        return response()->json([
            'game_id' => $game->getKey(),
            'player_one' => [
                'id' => $game->player_one_id,
                'name' => $game->playerOne?->user?->name ?? 'Unknown',
            ],
            'player_two' => [
                'id' => $game->player_two_id,
                'name' => $game->playerTwo?->user?->name ?? 'Unknown',
            ],
            'winner_id' => $game->winner_id,
            'map_name' => $game->map?->display_name ?? $game->map?->name ?? 'Unknown',
            'player_one_rating_change' => $game->player_one_rating_change,
            'player_two_rating_change' => $game->player_two_rating_change,
            'rounds' => $rounds,
        ]);
    }
}
