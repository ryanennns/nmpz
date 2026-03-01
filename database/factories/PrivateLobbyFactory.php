<?php

namespace Database\Factories;

use App\Models\Map;
use App\Models\Player;
use App\Models\PrivateLobby;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class PrivateLobbyFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'host_player_id' => Player::factory(),
            'invite_code' => strtoupper($this->faker->lexify('??????')),
            'map_id' => Map::factory(),
            'match_format' => 'classic',
            'status' => 'waiting',
        ];
    }
}
