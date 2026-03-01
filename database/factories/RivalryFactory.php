<?php

namespace Database\Factories;

use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class RivalryFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'player_one_id' => Player::factory(),
            'player_two_id' => Player::factory(),
            'consecutive_rematches' => 0,
            'total_games' => 0,
            'player_one_wins' => 0,
            'player_two_wins' => 0,
        ];
    }
}
