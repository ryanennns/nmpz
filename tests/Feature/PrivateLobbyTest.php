<?php

namespace Tests\Feature;

use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\PrivateLobby;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PrivateLobbyTest extends TestCase
{
    use RefreshDatabase;

    private function setupMap(): Map
    {
        $map = Map::factory()->create(['name' => 'likeacw-mapillary', 'is_active' => true]);
        Location::factory()->for($map)->create();

        return $map;
    }

    // --- CreatePrivateLobby ---

    public function test_creates_lobby_with_invite_code(): void
    {
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/private-lobby");

        $response->assertOk();
        $response->assertJsonStructure(['lobby_id', 'invite_code']);
        $this->assertSame(6, strlen($response->json('invite_code')));
    }

    public function test_expires_previous_waiting_lobbies(): void
    {
        $player = Player::factory()->create();

        $firstResponse = $this->postJson("/players/{$player->getKey()}/private-lobby");
        $firstLobbyId = $firstResponse->json('lobby_id');

        $this->postJson("/players/{$player->getKey()}/private-lobby");

        $this->assertDatabaseHas('private_lobbies', [
            'id' => $firstLobbyId,
            'status' => 'expired',
        ]);
    }

    public function test_validates_map_id_exists(): void
    {
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/private-lobby", [
            'map_id' => '00000000-0000-0000-0000-000000000000',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('map_id');
    }

    public function test_validates_match_format(): void
    {
        $player = Player::factory()->create();

        $response = $this->postJson("/players/{$player->getKey()}/private-lobby", [
            'match_format' => 'invalid',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('match_format');
    }

    public function test_defaults_match_format_to_classic(): void
    {
        $player = Player::factory()->create();

        $this->postJson("/players/{$player->getKey()}/private-lobby");

        $this->assertDatabaseHas('private_lobbies', [
            'host_player_id' => $player->getKey(),
            'match_format' => 'classic',
        ]);
    }

    // --- JoinPrivateLobby ---

    public function test_joins_valid_lobby(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $host = Player::factory()->create();
        $joiner = Player::factory()->create();

        $lobby = PrivateLobby::create([
            'host_player_id' => $host->getKey(),
            'invite_code' => 'ABCDEF',
            'match_format' => 'classic',
        ]);

        $response = $this->postJson("/players/{$joiner->getKey()}/private-lobby/join", [
            'code' => 'ABCDEF',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['game_id']);
    }

    public function test_cannot_join_own_lobby(): void
    {
        $host = Player::factory()->create();

        PrivateLobby::create([
            'host_player_id' => $host->getKey(),
            'invite_code' => 'ABCDEF',
            'match_format' => 'classic',
        ]);

        $response = $this->postJson("/players/{$host->getKey()}/private-lobby/join", [
            'code' => 'ABCDEF',
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_join_expired_lobby(): void
    {
        $host = Player::factory()->create();
        $joiner = Player::factory()->create();

        PrivateLobby::create([
            'host_player_id' => $host->getKey(),
            'invite_code' => 'ABCDEF',
            'match_format' => 'classic',
            'created_at' => now()->subMinutes(31),
        ]);

        $response = $this->postJson("/players/{$joiner->getKey()}/private-lobby/join", [
            'code' => 'ABCDEF',
        ]);

        $response->assertNotFound();
    }

    public function test_cannot_join_started_lobby(): void
    {
        $host = Player::factory()->create();
        $joiner = Player::factory()->create();

        PrivateLobby::create([
            'host_player_id' => $host->getKey(),
            'invite_code' => 'ABCDEF',
            'match_format' => 'classic',
            'status' => 'started',
        ]);

        $response = $this->postJson("/players/{$joiner->getKey()}/private-lobby/join", [
            'code' => 'ABCDEF',
        ]);

        $response->assertNotFound();
    }

    public function test_code_is_case_insensitive(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $host = Player::factory()->create();
        $joiner = Player::factory()->create();

        PrivateLobby::create([
            'host_player_id' => $host->getKey(),
            'invite_code' => 'ABCDEF',
            'match_format' => 'classic',
        ]);

        $response = $this->postJson("/players/{$joiner->getKey()}/private-lobby/join", [
            'code' => 'abcdef',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['game_id']);
    }

    public function test_lobby_status_changes_to_started(): void
    {
        Event::fake();
        Queue::fake();
        $this->setupMap();

        $host = Player::factory()->create();
        $joiner = Player::factory()->create();

        $lobby = PrivateLobby::create([
            'host_player_id' => $host->getKey(),
            'invite_code' => 'XYZABC',
            'match_format' => 'classic',
        ]);

        $this->postJson("/players/{$joiner->getKey()}/private-lobby/join", [
            'code' => 'XYZABC',
        ]);

        $lobby->refresh();
        $this->assertSame('started', $lobby->status);
    }

    // --- CancelPrivateLobby ---

    public function test_host_can_cancel_lobby(): void
    {
        $host = Player::factory()->create();

        $lobby = PrivateLobby::create([
            'host_player_id' => $host->getKey(),
            'invite_code' => 'ABCDEF',
            'match_format' => 'classic',
        ]);

        $response = $this->postJson("/players/{$host->getKey()}/private-lobby/{$lobby->getKey()}/cancel");

        $response->assertOk();
        $response->assertJson(['cancelled' => true]);

        $lobby->refresh();
        $this->assertSame('expired', $lobby->status);
    }

    public function test_non_host_cannot_cancel(): void
    {
        $host = Player::factory()->create();
        $other = Player::factory()->create();

        $lobby = PrivateLobby::create([
            'host_player_id' => $host->getKey(),
            'invite_code' => 'ABCDEF',
            'match_format' => 'classic',
        ]);

        $response = $this->postJson("/players/{$other->getKey()}/private-lobby/{$lobby->getKey()}/cancel");

        $response->assertStatus(403);
    }

    public function test_cannot_cancel_started_lobby(): void
    {
        $host = Player::factory()->create();

        $lobby = PrivateLobby::create([
            'host_player_id' => $host->getKey(),
            'invite_code' => 'ABCDEF',
            'match_format' => 'classic',
            'status' => 'started',
        ]);

        $response = $this->postJson("/players/{$host->getKey()}/private-lobby/{$lobby->getKey()}/cancel");

        $response->assertStatus(422);
    }
}
