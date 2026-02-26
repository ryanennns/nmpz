<?php

namespace Database\Factories;

use App\Models\Location;
use App\Models\Map;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class MapFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'name' => $this->faker->words(2, true),
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Map $map) {
            Location::factory()->for($map)->create();
        });
    }
}
