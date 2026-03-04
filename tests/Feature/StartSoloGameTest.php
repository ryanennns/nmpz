<?php

namespace Tests\Feature;

use App\Http\Controllers\StartSoloGame;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\SoloRound;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StartSoloGameTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_starts_a_solo_game_and_creates_five_rounds(): void
    {
        $player = Player::factory()->create();
        $map = Map::query()->create(['name' => 'likeacw-mapillary']);

        Location::factory()->count(StartSoloGame::TOTAL_ROUNDS)->create([
            'map_id' => $map->getKey(),
        ]);

        $otherMap = Map::query()->create(['name' => 'other-map']);
        Location::factory()->create(['map_id' => $otherMap->getKey()]);

        $response = $this->postJson('/singleplayer/games', [
            'player_id' => $player->getKey(),
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'game_id',
            ]);

        $gameId = $response->json('game_id');

        $this->assertDatabaseHas('solo_games', [
            'id' => $gameId,
            'player_id' => $player->getKey(),
            'status' => 'in_progress',
        ]);
        $this->assertDatabaseCount('solo_rounds', StartSoloGame::TOTAL_ROUNDS);
        $this->assertSame(
            [1, 2, 3, 4, 5],
            SoloRound::query()
                ->where('solo_game_id', $gameId)
                ->orderBy('round_number')
                ->pluck('round_number')
                ->all(),
        );
    }

    public function test_it_returns_a_server_error_when_there_are_not_enough_locations(): void
    {
        $player = Player::factory()->create();
        $map = Map::query()->create(['name' => 'likeacw-mapillary']);

        Location::factory()->count(StartSoloGame::TOTAL_ROUNDS - 1)->create([
            'map_id' => $map->getKey(),
        ]);

        $this->postJson('/singleplayer/games', [
            'player_id' => $player->getKey(),
        ])
            ->assertStatus(500);

        $this->assertDatabaseCount('solo_games', 0);
        $this->assertDatabaseCount('solo_rounds', 0);
    }

    public function test_it_requires_a_player_id(): void
    {
        $this->postJson('/singleplayer/games')
            ->assertUnauthorized();
    }

    public function test_it_rejects_starting_a_game_for_another_users_claimed_player(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $player = Player::factory()->create([
            'user_id' => $otherUser->getKey(),
        ]);

        $this->actingAs($user)
            ->postJson('/singleplayer/games', [
                'player_id' => $player->getKey(),
            ])
            ->assertUnauthorized();
    }
}
