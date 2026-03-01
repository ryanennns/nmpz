<?php

namespace Database\Factories;

use App\Models\Player;
use App\Models\Season;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class SeasonResultFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        $elo = $this->faker->numberBetween(800, 1500);

        return [
            'season_id' => Season::factory(),
            'player_id' => Player::factory(),
            'peak_elo' => $elo + $this->faker->numberBetween(0, 200),
            'final_elo' => $elo,
            'peak_rank' => 'Gold',
            'games_played' => $this->faker->numberBetween(5, 50),
            'games_won' => $this->faker->numberBetween(0, 25),
        ];
    }
}
