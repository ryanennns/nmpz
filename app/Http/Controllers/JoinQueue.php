<?php

namespace App\Http\Controllers;

use App\Http\Requests\JoinQueueRequest;
use App\Models\Player;
use App\Jobs\MatchmakeQueueJob;
use App\Services\QueueService;
use Illuminate\Http\JsonResponse;

class JoinQueue extends Controller
{
    public function __invoke(JoinQueueRequest $request, Player $player, QueueService $queueService): JsonResponse
    {
        $validated = $request->validated();

        if (! empty($validated['name'])) {
            $player->update(['name' => $validated['name']]);
            $player->user()->update(['name' => $validated['name']]);
        } elseif (! $player->name) {
            return response()->json(['error' => 'Name is required'], 422);
        }

        if ($player->hasActiveGame()) {
            return response()->json(['error' => 'Player already in game'], 409);
        }

        $queueService->add($player->getKey());
        $queueService->recordJoinTime($player->getKey());

        $mapId = $validated['map_id'] ?? null;
        $queueService->recordMapPreference($player->getKey(), $mapId);

        $matchFormat = $validated['match_format'] ?? null;
        $queueService->recordFormatPreference($player->getKey(), $matchFormat);

        MatchmakeQueueJob::dispatch();

        return response()->json([
            'queued' => true,
            'queue_count' => count($queueService->getQueue()),
        ]);
    }
}
