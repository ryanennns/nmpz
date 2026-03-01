<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RememberGameSession extends Controller
{
    public function __invoke(Request $request, Player $player, Game $game): JsonResponse
    {
        $validated = $request->validate([
            'active' => ['sometimes', 'boolean'],
        ]);

        $active = $validated['active'] ?? true;

        if (! $active) {
            $request->session()->forget('game_id');

            return response()->json(['remembered' => false]);
        }

        if ($game->status !== GameStatus::InProgress) {
            return response()->json(['remembered' => false], 409);
        }

        $request->session()->put('game_id', $game->getKey());

        return response()->json(['remembered' => true]);
    }
}
