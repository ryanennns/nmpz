<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Player>
 */
class PlayerFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'elo_rating' => $this->faker->numberBetween(800, 1200),
        ];
    }

    public function withElo(int $elo): static
    {
        return $this->state(fn (array $attributes) => [
            'elo_rating' => $elo,
        ]);
    }
}
