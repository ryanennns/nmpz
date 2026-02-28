<?php

namespace Database\Seeders;

use App\Models\Achievement;
use Illuminate\Database\Seeder;

class AchievementSeeder extends Seeder
{
    public function run(): void
    {
        $achievements = [
            ['key' => 'first_win', 'name' => 'First Blood', 'description' => 'Win your first game'],
            ['key' => 'win_streak_5', 'name' => 'On Fire', 'description' => 'Win 5 games in a row'],
            ['key' => 'win_streak_10', 'name' => 'Unstoppable', 'description' => 'Win 10 games in a row'],
            ['key' => 'perfect_round', 'name' => 'Bullseye', 'description' => 'Score 5000 in a single round'],
            ['key' => 'games_played_10', 'name' => 'Getting Started', 'description' => 'Play 10 games'],
            ['key' => 'games_played_50', 'name' => 'Regular', 'description' => 'Play 50 games'],
            ['key' => 'games_played_100', 'name' => 'Veteran', 'description' => 'Play 100 games'],
            ['key' => 'reach_gold', 'name' => 'Gold Rush', 'description' => 'Reach Gold rank'],
            ['key' => 'reach_diamond', 'name' => 'Diamond Hands', 'description' => 'Reach Diamond rank'],
            ['key' => 'reach_master', 'name' => 'Grand Master', 'description' => 'Reach Master rank'],
            ['key' => 'flawless_victory', 'name' => 'Flawless Victory', 'description' => 'Win a game at full health'],
            ['key' => 'comeback_king', 'name' => 'Comeback King', 'description' => 'Win a game after dropping below 1000 health'],
        ];

        foreach ($achievements as $data) {
            Achievement::query()->updateOrCreate(
                ['key' => $data['key']],
                $data,
            );
        }
    }
}
