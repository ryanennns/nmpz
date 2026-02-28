<?php

namespace App\Http\Controllers;

use App\Models\Achievement;
use App\Models\Player;
use App\Models\PlayerAchievement;
use Illuminate\Http\JsonResponse;

class PlayerAchievementsController extends Controller
{
    public function __invoke(Player $player): JsonResponse
    {
        $allAchievements = Achievement::all();
        $earned = PlayerAchievement::query()
            ->where('player_id', $player->getKey())
            ->get()
            ->keyBy('achievement_id');

        $result = $allAchievements->map(fn (Achievement $a) => [
            'key' => $a->key,
            'name' => $a->name,
            'description' => $a->description,
            'icon' => $a->icon,
            'earned_at' => $earned->get($a->getKey())?->earned_at?->toIso8601String(),
        ]);

        return response()->json($result);
    }
}
