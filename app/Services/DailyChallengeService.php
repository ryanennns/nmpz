<?php

namespace App\Services;

use App\Models\DailyChallenge;
use App\Models\DailyChallengeEntry;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\PlayerStats;
use Carbon\Carbon;
use App\CacheKeys;
use Illuminate\Support\Facades\Cache;

class DailyChallengeService
{
    public function getOrCreateForDate(?Carbon $date = null): DailyChallenge
    {
        $date = $date ?? today();

        $existing = DailyChallenge::whereDate('challenge_date', $date)->first();
        if ($existing) {
            return $existing;
        }

        $map = Map::query()->where('name', config('game.default_map'))->firstOrFail();
        $locations = Location::where('map_id', $map->getKey())
            ->inRandomOrder()
            ->limit(5)
            ->get();

        if ($locations->isEmpty()) {
            throw new \RuntimeException('No locations available for the default map.');
        }

        return DailyChallenge::create([
            'challenge_date' => $date->toDateString(),
            'map_id' => $map->getKey(),
            'location_ids' => $locations->pluck('id')->toArray(),
        ]);
    }

    public function calculateTier(int $totalScore): string
    {
        if ($totalScore >= config('game.daily_challenge.tier_gold')) {
            return 'gold';
        }

        if ($totalScore >= config('game.daily_challenge.tier_silver')) {
            return 'silver';
        }

        return 'bronze';
    }

    public function updateStreak(Player $player): array
    {
        $stats = PlayerStats::firstOrCreate(['player_id' => $player->getKey()]);

        $yesterday = DailyChallenge::whereDate('challenge_date', today()->subDay())->first();

        $completedYesterday = $yesterday
            && DailyChallengeEntry::query()
                ->where('daily_challenge_id', $yesterday->getKey())
                ->where('player_id', $player->getKey())
                ->whereNotNull('completed_at')
                ->exists();

        if ($completedYesterday) {
            $stats->daily_current_streak++;
        } else {
            $stats->daily_current_streak = 1;
        }

        if ($stats->daily_current_streak > $stats->daily_best_streak) {
            $stats->daily_best_streak = $stats->daily_current_streak;
        }

        $stats->save();

        return [
            'current_streak' => $stats->daily_current_streak,
            'best_streak' => $stats->daily_best_streak,
        ];
    }

    public function start(Player $player): array
    {
        $challenge = $this->getOrCreateForDate();
        $roundTimeout = config('game.daily_challenge.round_timeout_seconds');

        $existing = DailyChallengeEntry::query()
            ->where('daily_challenge_id', $challenge->getKey())
            ->where('player_id', $player->getKey())
            ->first();

        if ($existing) {
            if ($existing->completed_at) {
                return ['error' => 'Already completed today\'s challenge', 'status' => 422];
            }

            $existing->update(['round_started_at' => now()]);

            $nextRound = $existing->rounds_completed + 1;
            $locationId = $challenge->location_ids[$existing->rounds_completed] ?? null;
            $location = $locationId ? Location::find($locationId) : null;

            return [
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
            ];
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

        return [
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
        ];
    }

    public function guess(Player $player, DailyChallengeEntry $entry, float $lat, float $lng, AchievementService $achievementService): array
    {
        if ($entry->player_id !== $player->getKey()) {
            return ['error' => 'Not your entry', 'status' => 403];
        }

        if ($entry->completed_at) {
            return ['error' => 'Challenge already completed', 'status' => 422];
        }

        $challenge = $entry->dailyChallenge;
        $roundIndex = $entry->rounds_completed;
        $locationId = $challenge->location_ids[$roundIndex] ?? null;
        $location = $locationId ? Location::find($locationId) : null;

        if (! $location) {
            return ['error' => 'No more rounds', 'status' => 422];
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
            $location->lat, $location->lng, $lat, $lng,
        );

        $distanceKm = round(ScoringService::haversineDistanceKm(
            $location->lat, $location->lng, $lat, $lng,
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
            $tier = $this->calculateTier($totalScore);
            $updateData['tier'] = $tier;
            $entry->update($updateData);

            $streak = $this->updateStreak($player);

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

        return $response;
    }

    public function reset(Player $player): array
    {
        $challenge = $this->getOrCreateForDate();

        $entry = DailyChallengeEntry::query()
            ->where('daily_challenge_id', $challenge->getKey())
            ->where('player_id', $player->getKey())
            ->first();

        if (! $entry) {
            return ['error' => 'No entry to reset', 'status' => 422];
        }

        $entry->delete();

        return ['reset' => true];
    }

    public function getTodayInfo(?string $playerId = null): array
    {
        $challenge = $this->getOrCreateForDate();

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

        if ($playerId) {
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

        return $response;
    }

    public function getLeaderboard(): array
    {
        $challenge = $this->getOrCreateForDate();
        $challengeId = $challenge->getKey();

        return Cache::remember(CacheKeys::dailyLeaderboard($challengeId), 300, function () use ($challenge, $challengeId) {
            $totalParticipants = DailyChallengeEntry::query()
                ->where('daily_challenge_id', $challengeId)
                ->whereNotNull('completed_at')
                ->count();

            $entries = DailyChallengeEntry::query()
                ->where('daily_challenge_id', $challengeId)
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

            return [
                'challenge_date' => $challenge->challenge_date->toDateString(),
                'entries' => $entries,
                'total_participants' => $totalParticipants,
            ];
        });
    }

    public function getPlayerDailyStats(Player $player): array
    {
        $stats = $player->stats;

        $entries = DailyChallengeEntry::query()
            ->where('player_id', $player->getKey())
            ->whereNotNull('completed_at')
            ->get();

        $tierCounts = ['gold' => 0, 'silver' => 0, 'bronze' => 0];
        foreach ($entries as $entry) {
            if ($entry->tier && isset($tierCounts[$entry->tier])) {
                $tierCounts[$entry->tier]++;
            }
        }

        return [
            'current_streak' => $stats?->daily_current_streak ?? 0,
            'best_streak' => $stats?->daily_best_streak ?? 0,
            'challenges_completed' => $entries->count(),
            'average_score' => $entries->count() > 0
                ? (int) round($entries->avg('total_score'))
                : 0,
            'tier_counts' => $tierCounts,
        ];
    }
}
