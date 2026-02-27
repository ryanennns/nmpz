<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Events\RematchDeclined;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Http\JsonResponse;

class DeclineRematch extends Controller
{
    public function __invoke(Player $player, Game $game): JsonResponse
    {
        abort_if(
            ! in_array($player->getKey(), [$game->player_one_id, $game->player_two_id]),
            403,
        );
        abort_if($game->status !== GameStatus::Completed, 422, 'Game is not completed.');

        RematchDeclined::dispatch($game, $player);

        return response()->json(['status' => 'declined']);
    }
}
