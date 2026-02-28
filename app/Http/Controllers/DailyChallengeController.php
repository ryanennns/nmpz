<?php

namespace App\Http\Controllers;

use App\Models\DailyChallenge;
use App\Models\DailyChallengeEntry;
use App\Models\Location;
use App\Models\Player;
use App\Services\DailyChallengeService;
use App\Services\ScoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyChallengeController extends Controller
{
    public function today(DailyChallengeService $service): JsonResponse
    {
        $challenge = $service->getOrCreateForDate();
        $locations = Location::whereIn('id', $challenge->location_ids)->get();

        return response()->json([
            'challenge_id' => $challenge->getKey(),
            'challenge_date' => $challenge->challenge_date->toDateString(),
            'round_count' => count($challenge->location_ids),
        ]);
    }

    public function start(Request $request, Player $player, DailyChallengeService $service): JsonResponse
    {
        $challenge = $service->getOrCreateForDate();

        $existing = DailyChallengeEntry::query()
            ->where('daily_challenge_id', $challenge->getKey())
            ->where('player_id', $player->getKey())
            ->first();

        if ($existing) {
            if ($existing->completed_at) {
                return response()->json(['error' => 'Already completed today\'s challenge'], 422);
            }

            $nextRound = $existing->rounds_completed + 1;
            $locationId = $challenge->location_ids[$existing->rounds_completed] ?? null;
            $location = $locationId ? Location::find($locationId) : null;

            return response()->json([
                'entry_id' => $existing->getKey(),
                'round_number' => $nextRound,
                'total_rounds' => count($challenge->location_ids),
                'current_score' => $existing->total_score,
                'location' => $location ? [
                    'lat' => $location->lat,
                    'lng' => $location->lng,
                    'heading' => $location->heading,
                ] : null,
            ]);
        }

        $entry = DailyChallengeEntry::create([
            'daily_challenge_id' => $challenge->getKey(),
            'player_id' => $player->getKey(),
            'total_score' => 0,
            'round_scores' => [],
            'rounds_completed' => 0,
        ]);

        $locationId = $challenge->location_ids[0];
        $location = Location::find($locationId);

        return response()->json([
            'entry_id' => $entry->getKey(),
            'round_number' => 1,
            'total_rounds' => count($challenge->location_ids),
            'current_score' => 0,
            'location' => $location ? [
                'lat' => $location->lat,
                'lng' => $location->lng,
                'heading' => $location->heading,
            ] : null,
        ]);
    }

    public function guess(Request $request, Player $player, DailyChallengeEntry $entry): JsonResponse
    {
        if ($entry->player_id !== $player->getKey()) {
            return response()->json(['error' => 'Not your entry'], 403);
        }

        if ($entry->completed_at) {
            return response()->json(['error' => 'Challenge already completed'], 422);
        }

        $validated = $request->validate([
            'lat' => ['required', 'numeric'],
            'lng' => ['required', 'numeric'],
        ]);

        $challenge = $entry->dailyChallenge;
        $roundIndex = $entry->rounds_completed;
        $locationId = $challenge->location_ids[$roundIndex] ?? null;
        $location = $locationId ? Location::find($locationId) : null;

        if (! $location) {
            return response()->json(['error' => 'No more rounds'], 422);
        }

        $score = ScoringService::calculateScore(
            $location->lat, $location->lng,
            $validated['lat'], $validated['lng'],
        );

        $roundScores = $entry->round_scores ?? [];
        $roundScores[] = [
            'round' => $roundIndex + 1,
            'score' => $score,
            'distance_km' => round(ScoringService::haversineDistanceKm(
                $location->lat, $location->lng,
                $validated['lat'], $validated['lng'],
            ), 2),
        ];

        $totalScore = $entry->total_score + $score;
        $roundsCompleted = $entry->rounds_completed + 1;
        $isComplete = $roundsCompleted >= count($challenge->location_ids);

        $entry->update([
            'round_scores' => $roundScores,
            'total_score' => $totalScore,
            'rounds_completed' => $roundsCompleted,
            'completed_at' => $isComplete ? now() : null,
        ]);

        $response = [
            'score' => $score,
            'total_score' => $totalScore,
            'rounds_completed' => $roundsCompleted,
            'completed' => $isComplete,
            'location' => [
                'lat' => $location->lat,
                'lng' => $location->lng,
            ],
        ];

        if (! $isComplete) {
            $nextLocationId = $challenge->location_ids[$roundsCompleted] ?? null;
            $nextLocation = $nextLocationId ? Location::find($nextLocationId) : null;
            $response['next_location'] = $nextLocation ? [
                'lat' => $nextLocation->lat,
                'lng' => $nextLocation->lng,
                'heading' => $nextLocation->heading,
            ] : null;
        }

        return response()->json($response);
    }

    public function leaderboard(DailyChallengeService $service): JsonResponse
    {
        $challenge = $service->getOrCreateForDate();

        $entries = DailyChallengeEntry::query()
            ->where('daily_challenge_id', $challenge->getKey())
            ->whereNotNull('completed_at')
            ->with('player.user')
            ->orderByDesc('total_score')
            ->limit(50)
            ->get()
            ->map(fn (DailyChallengeEntry $entry) => [
                'player_name' => $entry->player?->user?->name ?? 'Unknown',
                'player_id' => $entry->player_id,
                'total_score' => $entry->total_score,
                'completed_at' => $entry->completed_at->toIso8601String(),
            ]);

        return response()->json([
            'challenge_date' => $challenge->challenge_date->toDateString(),
            'entries' => $entries,
        ]);
    }
}
