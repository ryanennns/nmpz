<?php

namespace Database\Factories;

use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Testing\WithFaker;

class FriendshipFactory extends Factory
{
    use WithFaker;

    public function definition(): array
    {
        return [
            'sender_id' => Player::factory(),
            'receiver_id' => Player::factory(),
            'status' => 'pending',
        ];
    }

    public function accepted(): static
    {
        return $this->state(fn () => ['status' => 'accepted']);
    }
}
