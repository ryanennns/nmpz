<?php

namespace App\Http\Controllers;

use App\Models\DailyChallengeEntry;
use App\Models\Player;
use App\Services\AchievementService;
use App\Services\DailyChallengeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyChallengeController extends Controller
{
    public function today(Request $request, DailyChallengeService $service): JsonResponse
    {
        return response()->json($service->getTodayInfo($request->query('player_id')));
    }

    public function start(Request $request, Player $player, DailyChallengeService $service): JsonResponse
    {
        $result = $service->start($player);

        if (isset($result['status'])) {
            return response()->json(['error' => $result['error']], $result['status']);
        }

        return response()->json($result);
    }

    public function guess(
        Request $request,
        Player $player,
        DailyChallengeEntry $entry,
        DailyChallengeService $service,
        AchievementService $achievementService,
    ): JsonResponse {
        $validated = $request->validate([
            'lat' => ['required', 'numeric'],
            'lng' => ['required', 'numeric'],
        ]);

        $result = $service->guess($player, $entry, $validated['lat'], $validated['lng'], $achievementService);

        if (isset($result['status'])) {
            return response()->json(['error' => $result['error']], $result['status']);
        }

        return response()->json($result);
    }

    public function leaderboard(DailyChallengeService $service): JsonResponse
    {
        return response()->json($service->getLeaderboard());
    }

    public function reset(Player $player, DailyChallengeService $service): JsonResponse
    {
        $result = $service->reset($player);

        if (isset($result['status'])) {
            return response()->json(['error' => $result['error']], $result['status']);
        }

        return response()->json($result);
    }

    public function stats(Player $player, DailyChallengeService $service): JsonResponse
    {
        return response()->json($service->getPlayerDailyStats($player));
    }
}
