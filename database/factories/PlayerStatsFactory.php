<?php

namespace Database\Factories;

use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlayerStatsFactory extends Factory
{
    public function definition(): array
    {
        return [
            'player_id' => Player::factory(),
        ];
    }
}
