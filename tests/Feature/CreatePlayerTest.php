<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreatePlayerTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_is_created(): void
    {
        $response = $this->postJson(route('players.create'), [
            'name' => 'Test Player',
        ]);

        $response->assertCreated()
            ->assertJsonPath('name', 'Test Player')
            ->assertJsonStructure([
                'id',
                'name',
            ]);

        $this->assertDatabaseHas('players', [
            'name' => 'Test Player',
            'elo_rating' => 1000,
        ]);
    }

    public function test_name_is_required(): void
    {
        $this->postJson(route('players.create'), [
            'name' => '',
        ])->assertStatus(422);
    }

    public function test_name_is_limited_to_32_characters(): void
    {
        $this->postJson(route('players.create'), [
            'name' => str_repeat('a', 33),
        ])->assertStatus(422);
    }
}
