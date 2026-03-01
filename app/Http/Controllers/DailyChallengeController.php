<?php

namespace App\Http\Controllers;

use App\Models\DailyChallengeEntry;
use App\Models\Location;
use App\Models\Player;
use App\Services\AchievementService;
use App\Services\DailyChallengeService;
use App\Services\ScoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyChallengeController extends Controller
{
    public function today(Request $request, DailyChallengeService $service): JsonResponse
    {
        $challenge = $service->getOrCreateForDate();

        $participantCount = DailyChallengeEntry::query()
            ->where('daily_challenge_id', $challenge->getKey())
            ->whereNotNull('completed_at')
            ->count();

        $response = [
            'challenge_id' => $challenge->getKey(),
            'challenge_date' => $challenge->challenge_date->toDateString(),
            'round_count' => count($challenge->location_ids),
            'participants' => $participantCount,
        ];

        if ($playerId = $request->query('player_id')) {
            $player = Player::find($playerId);
            if ($player) {
                $stats = $player->stats;
                $entry = DailyChallengeEntry::query()
                    ->where('daily_challenge_id', $challenge->getKey())
                    ->where('player_id', $player->getKey())
                    ->first();

                $response['player'] = [
                    'completed' => $entry?->completed_at !== null,
                    'tier' => $entry?->tier,
                    'total_score' => $entry?->total_score,
                    'current_streak' => $stats?->daily_current_streak ?? 0,
                    'best_streak' => $stats?->daily_best_streak ?? 0,
                ];
            }
        }

        return response()->json($response);
    }

    public function start(Request $request, Player $player, DailyChallengeService $service): JsonResponse
    {
        $challenge = $service->getOrCreateForDate();
        $roundTimeout = config('game.daily_challenge.round_timeout_seconds');

        $existing = DailyChallengeEntry::query()
            ->where('daily_challenge_id', $challenge->getKey())
            ->where('player_id', $player->getKey())
            ->first();

        if ($existing) {
            if ($existing->completed_at) {
                return response()->json(['error' => 'Already completed today\'s challenge'], 422);
            }

            $existing->update(['round_started_at' => now()]);

            $nextRound = $existing->rounds_completed + 1;
            $locationId = $challenge->location_ids[$existing->rounds_completed] ?? null;
            $location = $locationId ? Location::find($locationId) : null;

            return response()->json([
                'entry_id' => $existing->getKey(),
                'round_number' => $nextRound,
                'total_rounds' => count($challenge->location_ids),
                'current_score' => $existing->total_score,
                'round_timeout' => $roundTimeout,
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
            'started_at' => now(),
            'round_started_at' => now(),
        ]);

        $locationId = $challenge->location_ids[0];
        $location = Location::find($locationId);

        return response()->json([
            'entry_id' => $entry->getKey(),
            'round_number' => 1,
            'total_rounds' => count($challenge->location_ids),
            'current_score' => 0,
            'round_timeout' => $roundTimeout,
            'location' => $location ? [
                'lat' => $location->lat,
                'lng' => $location->lng,
                'heading' => $location->heading,
            ] : null,
        ]);
    }

    public function guess(
        Request $request,
        Player $player,
        DailyChallengeEntry $entry,
        DailyChallengeService $service,
        AchievementService $achievementService,
    ): JsonResponse {
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

        $timedOut = false;
        $roundTimeout = config('game.daily_challenge.round_timeout_seconds');
        if ($entry->round_started_at) {
            $elapsed = $entry->round_started_at->diffInSeconds(now());
            if ($elapsed > $roundTimeout) {
                $timedOut = true;
            }
        }

        $score = $timedOut ? 0 : ScoringService::calculateScore(
            $location->lat, $location->lng,
            $validated['lat'], $validated['lng'],
        );

        $distanceKm = round(ScoringService::haversineDistanceKm(
            $location->lat, $location->lng,
            $validated['lat'], $validated['lng'],
        ), 2);

        $roundScores = $entry->round_scores ?? [];
        $roundScores[] = [
            'round' => $roundIndex + 1,
            'score' => $score,
            'distance_km' => $distanceKm,
            'timed_out' => $timedOut,
        ];

        $totalScore = $entry->total_score + $score;
        $roundsCompleted = $entry->rounds_completed + 1;
        $isComplete = $roundsCompleted >= count($challenge->location_ids);

        $updateData = [
            'round_scores' => $roundScores,
            'total_score' => $totalScore,
            'rounds_completed' => $roundsCompleted,
            'completed_at' => $isComplete ? now() : null,
            'round_started_at' => $isComplete ? null : now(),
        ];

        $response = [
            'score' => $score,
            'total_score' => $totalScore,
            'rounds_completed' => $roundsCompleted,
            'completed' => $isComplete,
            'timed_out' => $timedOut,
            'location' => [
                'lat' => $location->lat,
                'lng' => $location->lng,
            ],
        ];

        if ($isComplete) {
            $tier = $service->calculateTier($totalScore);
            $updateData['tier'] = $tier;
            $entry->update($updateData);

            $streak = $service->updateStreak($player);

            $completedCount = DailyChallengeEntry::query()
                ->where('player_id', $player->getKey())
                ->whereNotNull('completed_at')
                ->count();
            if ($completedCount >= 7) {
                $achievementService->award($player, 'daily_devotee');
            }

            $response['tier'] = $tier;
            $response['streak'] = $streak;
        } else {
            $entry->update($updateData);

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

        $totalParticipants = DailyChallengeEntry::query()
            ->where('daily_challenge_id', $challenge->getKey())
            ->whereNotNull('completed_at')
            ->count();

        $entries = DailyChallengeEntry::query()
            ->where('daily_challenge_id', $challenge->getKey())
            ->whereNotNull('completed_at')
            ->with('player.user')
            ->orderByDesc('total_score')
            ->limit(50)
            ->get()
            ->map(fn (DailyChallengeEntry $entry, int $index) => [
                'rank' => $index + 1,
                'player_name' => $entry->player?->user?->name ?? 'Unknown',
                'player_id' => $entry->player_id,
                'total_score' => $entry->total_score,
                'tier' => $entry->tier,
                'completed_at' => $entry->completed_at->toIso8601String(),
            ]);

        return response()->json([
            'challenge_date' => $challenge->challenge_date->toDateString(),
            'entries' => $entries,
            'total_participants' => $totalParticipants,
        ]);
    }

    public function reset(Player $player, DailyChallengeService $service): JsonResponse
    {
        $challenge = $service->getOrCreateForDate();

        $entry = DailyChallengeEntry::query()
            ->where('daily_challenge_id', $challenge->getKey())
            ->where('player_id', $player->getKey())
            ->first();

        if (! $entry) {
            return response()->json(['error' => 'No entry to reset'], 422);
        }

        $entry->delete();

        return response()->json(['reset' => true]);
    }

    public function stats(Player $player, DailyChallengeService $service): JsonResponse
    {
        return response()->json($service->getPlayerDailyStats($player));
    }
}
