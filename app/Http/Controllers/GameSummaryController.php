<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Round;
use Inertia\Inertia;
use Inertia\Response;

class GameSummaryController extends Controller
{
    public function __invoke(Game $game): Response
    {
        abort_if($game->status !== GameStatus::Completed, 404);

        $game->load(['playerOne', 'playerTwo', 'rounds.location']);

        $rounds = $game->rounds->map(fn (Round $round) => [
            'id' => $round->getKey(),
            'round_number' => $round->round_number,
            'player_one_score' => $round->player_one_score,
            'player_two_score' => $round->player_two_score,
            'location' => $round->location ? [
                'lat' => $round->location->lat,
                'lng' => $round->location->lng,
            ] : null,
            'player_one_guess' => ($round->player_one_guess_lat !== null && $round->player_one_guess_lng !== null) ? [
                'lat' => $round->player_one_guess_lat,
                'lng' => $round->player_one_guess_lng,
            ] : null,
            'player_two_guess' => ($round->player_two_guess_lat !== null && $round->player_two_guess_lng !== null) ? [
                'lat' => $round->player_two_guess_lat,
                'lng' => $round->player_two_guess_lng,
            ] : null,
        ]);

        return Inertia::render('game-summary', [
            'game' => [
                'id' => $game->getKey(),
                'player_one' => [
                    'id' => $game->player_one_id,
                    'name' => $game->playerOne?->name,
                ],
                'player_two' => [
                    'id' => $game->player_two_id,
                    'name' => $game->playerTwo?->name,
                ],
                'winner_id' => $game->winner_id,
                'player_one_total_score' => $game->playerOneScore(),
                'player_two_total_score' => $game->playerTwoScore(),
                'rounds' => $rounds,
            ],
        ]);
    }
}
