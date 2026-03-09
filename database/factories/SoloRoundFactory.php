<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SoloRoundFactory extends Factory
{
    public function definition(): array
    {
        return [
            'guess_lat' => $this->faker->latitude(),
            'guess_lng' => $this->faker->longitude(),
            'score' => $this->faker->numberBetween(0, 5000),
            'distance_km' => $this->faker->randomFloat(3, 0, 20000),
        ];
    }
}
