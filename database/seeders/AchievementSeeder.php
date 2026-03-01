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
            ['key' => 'rival', 'name' => 'Rival', 'description' => 'Play 5 consecutive rematches with the same opponent'],
            ['key' => 'daily_devotee', 'name' => 'Daily Devotee', 'description' => 'Complete 7 daily challenges'],
            ['key' => 'solo_first_game', 'name' => 'Solo Debut', 'description' => 'Complete your first solo game'],
            ['key' => 'solo_streak_10', 'name' => 'On a Roll', 'description' => 'Survive 10 rounds in Streak mode'],
            ['key' => 'solo_streak_25', 'name' => 'Unstoppable Force', 'description' => 'Survive 25 rounds in Streak mode'],
            ['key' => 'solo_perfect_round', 'name' => 'Solo Bullseye', 'description' => 'Score 5000 in a solo round'],
            ['key' => 'solo_time_attack_master', 'name' => 'Speed Demon', 'description' => 'Score 25,000+ in Time Attack mode'],
            ['key' => 'solo_explorer_100', 'name' => 'World Traveler', 'description' => 'Complete 100 rounds in Explorer mode'],
            ['key' => 'solo_marathon', 'name' => 'Marathon Runner', 'description' => 'Play 50 solo games'],
            ['key' => 'solo_perfectionist', 'name' => 'Perfectionist', 'description' => 'Earn Gold tier in Perfect Score mode'],
        ];

        foreach ($achievements as $data) {
            Achievement::query()->updateOrCreate(
                ['key' => $data['key']],
                $data,
            );
        }
    }
}
