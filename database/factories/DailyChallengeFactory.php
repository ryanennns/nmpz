<?php

namespace Database\Factories;

use App\Models\Map;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class DailyChallengeFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'challenge_date' => $this->faker->unique()->date(),
            'map_id' => Map::factory(),
            'location_ids' => [],
        ];
    }
}
