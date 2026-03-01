<?php

namespace App\Http\Controllers;

use App\Events\GameMessage;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SendMessage extends Controller
{
    public function __invoke(Request $request, Player $player, Game $game): JsonResponse
    {
        if ($player->user()->exists() && $request->user()?->getKey() !== $player->user()->first()->getKey()) {
            abort(401, 'nope');
        }

        abort_if(
            ! in_array($player->getKey(), [$game->player_one_id, $game->player_two_id]),
            403,
        );

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:255'],
        ]);

        $player->loadMissing('user');

        GameMessage::dispatch($game, $player, $validated['message']);

        return response()->json(['ok' => true]);
    }
}
