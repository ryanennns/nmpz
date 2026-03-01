<?php

namespace Tests\Feature;

use App\Models\Achievement;
use App\Models\Player;
use App\Models\PlayerAchievement;
use Database\Seeders\AchievementSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlayerAchievementsControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AchievementSeeder::class);
    }

    public function test_returns_all_achievements(): void
    {
        $player = Player::factory()->create();

        $response = $this->getJson("/players/{$player->getKey()}/achievements");

        $response->assertOk();
        $response->assertJsonCount(22);
    }

    public function test_earned_achievements_have_earned_at(): void
    {
        $player = Player::factory()->create();
        $achievement = Achievement::where('key', 'first_win')->first();

        PlayerAchievement::create([
            'player_id' => $player->getKey(),
            'achievement_id' => $achievement->getKey(),
            'earned_at' => now(),
        ]);

        $response = $this->getJson("/players/{$player->getKey()}/achievements");

        $response->assertOk();
        $data = collect($response->json());
        $firstWin = $data->firstWhere('key', 'first_win');
        $this->assertNotNull($firstWin['earned_at']);
    }

    public function test_unearned_achievements_have_null_earned_at(): void
    {
        $player = Player::factory()->create();

        $response = $this->getJson("/players/{$player->getKey()}/achievements");

        $response->assertOk();
        $data = collect($response->json());
        $data->each(function ($achievement) {
            $this->assertNull($achievement['earned_at']);
        });
    }

    public function test_returns_404_for_nonexistent_player(): void
    {
        $fakeId = '00000000-0000-0000-0000-000000000000';

        $response = $this->getJson("/players/{$fakeId}/achievements");

        $response->assertNotFound();
    }
}
