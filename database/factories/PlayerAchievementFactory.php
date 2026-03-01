<?php

namespace Database\Factories;

use App\Models\Achievement;
use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlayerAchievementFactory extends Factory
{
    public function definition(): array
    {
        return [
            'player_id' => Player::factory(),
            'achievement_id' => Achievement::factory(),
            'earned_at' => now(),
        ];
    }
}
