<?php

namespace App\Http\Controllers;

use App\Actions\CreateMatch;
use App\Models\Player;
use App\Models\PrivateLobby;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JoinPrivateLobby extends Controller
{
    public function __invoke(Request $request, Player $player, CreateMatch $createMatch): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $lobby = PrivateLobby::query()
            ->where('invite_code', strtoupper($validated['code']))
            ->where('status', 'waiting')
            ->where('created_at', '>=', now()->subMinutes(30))
            ->first();

        if (! $lobby) {
            return response()->json(['error' => 'Lobby not found or expired'], 404);
        }

        if ($lobby->host_player_id === $player->getKey()) {
            return response()->json(['error' => 'Cannot join your own lobby'], 422);
        }

        $host = Player::find($lobby->host_player_id);
        if (! $host) {
            return response()->json(['error' => 'Host not found'], 404);
        }

        $lobby->update(['status' => 'started']);

        $game = $createMatch->handle($host, $player, $lobby->map_id);

        return response()->json([
            'game_id' => $game->getKey(),
        ]);
    }
}
