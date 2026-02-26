<?php

namespace Database\Factories;

use App\Models\Location;
use App\Models\Map;
use Illuminate\Database\Eloquent\Factories\Factory;

class MapFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Map $map) {
            Location::factory()->for($map)->create();
        });
    }
}
