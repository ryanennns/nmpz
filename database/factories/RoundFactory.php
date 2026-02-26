<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\Round;
use Illuminate\Database\Eloquent\Factories\Factory;

class RoundFactory extends Factory
{
    public function definition(): array
    {
        $locationLat = fake()->latitude();
        $locationLng = fake()->longitude();

        return [
            'game_id' => Game::factory(),
            'round_number' => fake()->numberBetween(1, 5),
            'location_lat' => $locationLat,
            'location_lng' => $locationLng,
            'location_heading' => fake()->numberBetween(0, 359),
            'player_one_guess_lat' => null,
            'player_one_guess_lng' => null,
            'player_two_guess_lat' => null,
            'player_two_guess_lng' => null,
            'player_one_score' => null,
            'player_two_score' => null,
        ];
    }

    public function withGuesses(): static
    {
        return $this->afterMaking(function (Round $round) {
            $p1Lat = fake()->latitude();
            $p1Lng = fake()->longitude();
            $p2Lat = fake()->latitude();
            $p2Lng = fake()->longitude();

            $round->player_one_guess_lat = $p1Lat;
            $round->player_one_guess_lng = $p1Lng;
            $round->player_two_guess_lat = $p2Lat;
            $round->player_two_guess_lng = $p2Lng;
            $round->player_one_score = Round::calculateScore($round->location_lat, $round->location_lng, $p1Lat, $p1Lng);
            $round->player_two_score = Round::calculateScore($round->location_lat, $round->location_lng, $p2Lat, $p2Lng);
        });
    }
}
