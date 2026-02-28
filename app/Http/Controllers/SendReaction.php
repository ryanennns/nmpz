<?php

namespace App\Http\Controllers;

use App\Events\GameReaction;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SendReaction extends Controller
{
    public function __invoke(Request $request, Player $player, Game $game): JsonResponse
    {
        abort_if(! $game->hasPlayer($player), 403, 'Not in this game.');

        $validated = $request->validate([
            'reaction' => ['required', 'string', 'in:' . implode(',', GameReaction::ALLOWED_REACTIONS)],
        ]);

        GameReaction::dispatch($game, $player->getKey(), $validated['reaction']);

        return response()->json(['sent' => true]);
    }
}
