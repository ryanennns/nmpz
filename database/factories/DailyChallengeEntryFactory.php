<?php

namespace Database\Factories;

use App\Models\DailyChallenge;
use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class DailyChallengeEntryFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'daily_challenge_id' => DailyChallenge::factory(),
            'player_id' => Player::factory(),
            'total_score' => 0,
            'round_scores' => [],
            'rounds_completed' => 0,
        ];
    }

    public function completed(int $score = 20000): static
    {
        return $this->state(fn () => [
            'total_score' => $score,
            'rounds_completed' => 5,
            'completed_at' => now(),
            'tier' => $score >= 20000 ? 'gold' : ($score >= 15000 ? 'silver' : 'bronze'),
        ]);
    }
}
