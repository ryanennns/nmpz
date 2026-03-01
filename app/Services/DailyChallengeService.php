<?php

namespace App\Services;

use App\Models\DailyChallenge;
use App\Models\DailyChallengeEntry;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\PlayerStats;
use Carbon\Carbon;

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
