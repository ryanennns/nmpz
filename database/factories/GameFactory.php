<?php

namespace Database\Factories;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Map;
use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class GameFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'player_one_id' => Player::factory(),
            'player_two_id' => Player::factory(),
            'winner_id' => null,
            'map_id' => Map::factory(),
            'seed' => $this->faker->numberBetween(0, 99999),
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
                'winner_id' => $this->faker->randomElement([$game->player_one_id, $game->player_two_id]),
            ]);
        });
    }

    public function bestOfThree(): static
    {
        return $this->state(fn (array $attributes) => [
            'match_format' => 'bo3',
            'max_rounds' => 3,
            'player_one_health' => 0,
            'player_two_health' => 0,
        ]);
    }

    public function bestOfFive(): static
    {
        return $this->state(fn (array $attributes) => [
            'match_format' => 'bo5',
            'max_rounds' => 5,
            'player_one_health' => 0,
            'player_two_health' => 0,
        ]);
    }

    public function bestOfSeven(): static
    {
        return $this->state(fn (array $attributes) => [
            'match_format' => 'bo7',
            'max_rounds' => 7,
            'player_one_health' => 0,
            'player_two_health' => 0,
        ]);
    }
}
