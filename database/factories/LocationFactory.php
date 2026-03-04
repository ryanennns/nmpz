<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class LocationFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'lat' => $this->faker->latitude(),
            'lng' => $this->faker->longitude(),
            'heading' => $this->faker->numberBetween(0, 359),
        ];
    }
}
