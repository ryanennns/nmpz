<?php

namespace App\Services;

use App\Models\DailyChallenge;
use App\Models\Location;
use App\Models\Map;
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
}
