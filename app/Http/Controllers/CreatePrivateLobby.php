<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Models\PrivateLobby;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreatePrivateLobby extends Controller
{
    public function __invoke(Request $request, Player $player): JsonResponse
    {
        $validated = $request->validate([
            'map_id' => ['nullable', 'uuid', 'exists:maps,id'],
            'match_format' => ['nullable', 'string', 'in:classic,bo3,bo5,bo7,rush'],
        ]);

        // Expire old waiting lobbies for this player
        PrivateLobby::query()
            ->where('host_player_id', $player->getKey())
            ->where('status', 'waiting')
            ->update(['status' => 'expired']);

        $lobby = PrivateLobby::create([
            'host_player_id' => $player->getKey(),
            'invite_code' => PrivateLobby::generateCode(),
            'map_id' => $validated['map_id'] ?? null,
            'match_format' => $validated['match_format'] ?? 'classic',
        ]);

        return response()->json([
            'lobby_id' => $lobby->getKey(),
            'invite_code' => $lobby->invite_code,
        ]);
    }
}
