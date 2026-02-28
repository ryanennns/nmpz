<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Models\PrivateLobby;
use Illuminate\Http\JsonResponse;

class CancelPrivateLobby extends Controller
{
    public function __invoke(Player $player, PrivateLobby $privateLobby): JsonResponse
    {
        if ($privateLobby->host_player_id !== $player->getKey()) {
            return response()->json(['error' => 'Not your lobby'], 403);
        }

        if ($privateLobby->status !== 'waiting') {
            return response()->json(['error' => 'Lobby already ' . $privateLobby->status], 422);
        }

        $privateLobby->update(['status' => 'expired']);

        return response()->json(['cancelled' => true]);
    }
}
