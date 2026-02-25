<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Player>
 */
class PlayerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'elo_rating' => fake()->numberBetween(800, 1200),
        ];
    }

    public function withElo(int $elo): static
    {
        return $this->state(fn (array $attributes) => [
            'elo_rating' => $elo,
        ]);
    }
}
