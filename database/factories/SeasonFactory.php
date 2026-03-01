<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class SeasonFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'season_number' => $this->faker->unique()->numberBetween(1, 100),
            'start_date' => now()->subMonth(),
            'end_date' => now()->addMonth(),
            'is_active' => false,
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => ['is_active' => true]);
    }
}
