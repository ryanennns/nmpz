<?php

namespace Database\Factories;

use App\Models\Map;
use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class SoloPersonalBestFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'player_id' => Player::factory(),
            'map_id' => Map::factory(),
            'mode' => 'explorer',
            'best_score' => $this->faker->numberBetween(1000, 25000),
            'best_rounds' => $this->faker->numberBetween(1, 20),
        ];
    }
}
