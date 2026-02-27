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
        $validated = $request->validate([
            'name' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        if (! empty($validated['name'])) {
            $player->update(['name' => $validated['name']]);
            $player->user()->update(['name' => $validated['name']]);
        } elseif (! $player->name) {
            return response()->json(['error' => 'Name is required'], 422);
        }

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
