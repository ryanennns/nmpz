<?php

namespace Database\Factories;

use App\Models\Map;
use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class SoloGameFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'player_id' => Player::factory(),
            'map_id' => Map::factory(),
            'mode' => 'explorer',
            'status' => 'in_progress',
            'total_score' => 0,
            'rounds_completed' => 0,
            'round_scores' => [],
            'location_ids' => [],
            'current_location_index' => 0,
            'elapsed_seconds' => 0,
            'started_at' => now(),
            'round_started_at' => now(),
        ];
    }

    public function streak(string $difficulty = 'normal'): static
    {
        return $this->state(fn () => [
            'mode' => 'streak',
            'difficulty' => $difficulty,
            'health' => config("game.solo.streak_hp.{$difficulty}", 5000),
        ]);
    }

    public function timeAttack(): static
    {
        return $this->state(fn () => [
            'mode' => 'time_attack',
        ]);
    }

    public function perfectScore(): static
    {
        return $this->state(fn () => [
            'mode' => 'perfect_score',
        ]);
    }

    public function completed(int $score = 10000): static
    {
        return $this->state(fn () => [
            'status' => 'completed',
            'total_score' => $score,
            'completed_at' => now(),
        ]);
    }
}
