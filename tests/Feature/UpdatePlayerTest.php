<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpdatePlayerTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_name_is_updated(): void
    {
        $player = Player::factory()->create([
            'user_id' => User::factory()->create(),
            'name' => 'Old Name',
        ]);

        $this->patchJson(route('players.update', $player), [
            'name' => 'New Name',
        ])->assertOk()->assertJson([
            'updated' => true,
            'name' => 'New Name',
        ]);

        $player->refresh();

        $this->assertSame('New Name', $player->name);
        $this->assertSame('New Name', $player->user->name);
    }

    public function test_name_is_required(): void
    {
        $player = Player::factory()->create();

        $this->patchJson(route('players.update', $player), [
            'name' => '',
        ])->assertStatus(422);
    }

    public function test_name_is_limited_to_32_chars(): void
    {
        $player = Player::factory()->create();

        $this->patchJson(route('players.update', $player), [
            'name' => str_repeat('a', 33),
        ])->assertStatus(422);
    }

    public function test_unknown_player_returns_404(): void
    {
        $this->patchJson('/players/non-existent-id', [
            'name' => 'New Name',
        ])->assertNotFound();
    }
}
