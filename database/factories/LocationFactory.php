<?php

namespace Database\Factories;

use App\Models\Map;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class LocationFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'map_id' => Map::factory(),
            'lat' => $this->faker->latitude(),
            'lng' => $this->faker->longitude(),
            'heading' => $this->faker->numberBetween(0, 359),
        ];
    }
}
