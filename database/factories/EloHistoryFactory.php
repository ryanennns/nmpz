<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class EloHistoryFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        $before = $this->faker->numberBetween(800, 1500);
        $change = $this->faker->numberBetween(-30, 30);

        return [
            'player_id' => Player::factory(),
            'game_id' => Game::factory(),
            'rating_before' => $before,
            'rating_after' => $before + $change,
            'rating_change' => $change,
            'opponent_rating' => $this->faker->numberBetween(800, 1500),
        ];
    }
}
