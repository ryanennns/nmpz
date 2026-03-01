<?php

namespace App\Http\Controllers;

use App\Events\SpectatorChatMessage;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SendSpectatorChat extends Controller
{
    public function __invoke(Request $request, Game $game): JsonResponse
    {
        abort_if(! $game->allow_spectators, 403, 'Spectating not allowed.');

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:200'],
            'player_name' => ['required', 'string', 'max:32'],
        ]);

        SpectatorChatMessage::dispatch($game, $validated['player_name'], $validated['message']);

        return response()->json(['sent' => true]);
    }
}
