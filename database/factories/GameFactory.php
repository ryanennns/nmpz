<?php

namespace Database\Factories;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Map;
use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;

class GameFactory extends Factory
{
    public function definition(): array
    {
        return [
            'player_one_id' => Player::factory(),
            'player_two_id' => Player::factory(),
            'winner_id' => null,
            'map_id' => Map::factory(),
            'seed' => fake()->numberBetween(0, 99999),
            'status' => GameStatus::Pending,
            'player_one_health' => 5000,
            'player_two_health' => 5000,
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => GameStatus::InProgress,
        ]);
    }

    public function completed(): static
    {
        return $this->afterCreating(function (Game $game) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => fake()->randomElement([$game->player_one_id, $game->player_two_id]),
            ]);
        });
    }
}
