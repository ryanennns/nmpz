<?php

namespace Database\Factories;

use App\Models\Map;
use Illuminate\Database\Eloquent\Factories\Factory;

class LocationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'map_id' => Map::factory(),
            'lat' => fake()->latitude(),
            'lng' => fake()->longitude(),
            'heading' => fake()->numberBetween(0, 359),
        ];
    }
}
