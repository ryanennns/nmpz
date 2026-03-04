<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Jobs\MatchmakeQueueJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class JoinQueue extends Controller
{
    public function __invoke(Request $request, Player $player): JsonResponse
    {
        if ($player->hasActiveGame()) {
            return response()->json(['error' => 'Player already in game'], 409);
        }

        $queue = Cache::get('matchmaking_queue', []);
        $queue = array_values(array_filter($queue, fn ($id) => $id !== $player->getKey()));

        $queue[] = $player->getKey();
        $queue = array_values(array_unique($queue));
        Cache::put('matchmaking_queue', $queue, now()->addMinutes(5));
        MatchmakeQueueJob::dispatch();

        return response()->json([
            'queued' => true,
            'queue_count' => count($queue),
        ]);
    }
}
