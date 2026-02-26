<?php

namespace Database\Factories;

use App\Enums\GameStatus;
use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class GameFactory extends Factory
{
    private const MAPS = [
        'World',
        'United States',
        'Europe',
        'A Diverse World',
        'Famous Places',
        'Urban World',
    ];

    public function definition(): array
    {
        return [
            'player_one_id' => Player::factory(),
            'player_two_id' => Player::factory(),
            'winner_id' => null,
            'map_name' => fake()->randomElement(self::MAPS),
            'map_seed' => Str::random(16),
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
        return $this->afterCreating(function (\App\Models\Game $game) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => fake()->randomElement([$game->player_one_id, $game->player_two_id]),
            ]);
        });
    }
}
