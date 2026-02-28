<?php

namespace App\Http\Controllers;

use App\Http\Requests\GuessRequest;
use App\Models\Game;
use App\Models\Player;
use App\Models\Round;
use App\Services\GuessService;
use Illuminate\Http\JsonResponse;

class PlayerMakesGuess extends Controller
{
    public function __invoke(GuessRequest $request, Player $player, Game $game, Round $round, GuessService $guessService): JsonResponse
    {
        abort_if($round->game_id !== $game->getKey(), 404);

        $round = $guessService->processGuess($player, $game, $round, $request->validated());

        return response()->json($round);
    }
}
