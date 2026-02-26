<?php

namespace App\Http\Controllers;

use App\Events\PlayerGuessed;
use App\Events\RoundFinished;
use App\Models\Game;
use App\Models\Round;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerMakesGuess extends Controller
{
    public function __invoke(Request $request, User $user, Game $game, Round $round): JsonResponse
    {
        $player = $user->player;

        abort_if($player === null, 403);
        abort_if(
            ! in_array($player->getKey(), [$game->player_one_id, $game->player_two_id]),
            403,
        );
        abort_if($round->game_id !== $game->getKey(), 404);

        $isPlayerOne = $player->getKey() === $game->player_one_id;

        abort_if($isPlayerOne ? $round->player_one_locked_in : $round->player_two_locked_in, 403);

        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        if ($isPlayerOne) {
            $round->player_one_guess_lat = $validated['lat'];
            $round->player_one_guess_lng = $validated['lng'];
            $round->player_one_locked_in = true;
        } else {
            $round->player_two_guess_lat = $validated['lat'];
            $round->player_two_guess_lng = $validated['lng'];
            $round->player_two_locked_in = true;
        }

        $round->save();

        PlayerGuessed::dispatch($round, $player);

        if ($round->player_one_locked_in && $round->player_two_locked_in) {
            $round->evaluateScores();
            RoundFinished::dispatch($round);
        }

        return response()->json($round);
    }
}
