<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\Rivalry;
use App\Services\RivalryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RematchStreakTest extends TestCase
{
    use RefreshDatabase;

    // --- Rivalry model ---

    public function test_find_or_create_creates_rivalry(): void
    {
        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        $rivalry = Rivalry::findOrCreateBetween($p1->getKey(), $p2->getKey());

        $this->assertNotNull($rivalry);
        $this->assertSame(0, $rivalry->consecutive_rematches);
    }

    public function test_find_or_create_returns_same_regardless_of_order(): void
    {
        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        $r1 = Rivalry::findOrCreateBetween($p1->getKey(), $p2->getKey());
        $r2 = Rivalry::findOrCreateBetween($p2->getKey(), $p1->getKey());

        $this->assertSame($r1->getKey(), $r2->getKey());
    }

    // --- RivalryService ---

    public function test_record_rematch_increments_streak(): void
    {
        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        $game = Game::factory()->create([
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $p1->getKey(),
        ]);

        $rivalry = app(RivalryService::class)->recordRematch($game);

        $this->assertSame(1, $rivalry->consecutive_rematches);
        $this->assertSame(1, $rivalry->total_games);
    }

    public function test_record_rematch_tracks_wins(): void
    {
        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        // Ensure consistent ordering
        $ids = [$p1->getKey(), $p2->getKey()];
        sort($ids);

        $game = Game::factory()->create([
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $ids[0], // Winner is the player stored as player_one in rivalry
        ]);

        $rivalry = app(RivalryService::class)->recordRematch($game);

        $this->assertSame(1, $rivalry->player_one_wins);
        $this->assertSame(0, $rivalry->player_two_wins);
    }

    public function test_reset_streak_sets_to_zero(): void
    {
        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();

        $rivalry = Rivalry::findOrCreateBetween($p1->getKey(), $p2->getKey());
        $rivalry->update(['consecutive_rematches' => 5]);

        app(RivalryService::class)->resetStreak($p1->getKey(), $p2->getKey());

        $rivalry->refresh();
        $this->assertSame(0, $rivalry->consecutive_rematches);
    }

    public function test_elo_bonus_at_3_rematches(): void
    {
        $rivalry = new Rivalry(['consecutive_rematches' => 3]);

        $multiplier = app(RivalryService::class)->eloBonusMultiplier($rivalry);

        $this->assertSame(1.25, $multiplier);
    }

    public function test_elo_bonus_at_5_rematches(): void
    {
        $rivalry = new Rivalry(['consecutive_rematches' => 5]);

        $multiplier = app(RivalryService::class)->eloBonusMultiplier($rivalry);

        $this->assertSame(1.5, $multiplier);
    }

    public function test_no_bonus_below_3(): void
    {
        $rivalry = new Rivalry(['consecutive_rematches' => 2]);

        $multiplier = app(RivalryService::class)->eloBonusMultiplier($rivalry);

        $this->assertSame(1.0, $multiplier);
    }

    public function test_consecutive_rematches_accumulate(): void
    {
        $p1 = Player::factory()->create();
        $p2 = Player::factory()->create();
        $service = app(RivalryService::class);

        for ($i = 0; $i < 3; $i++) {
            $game = Game::factory()->create([
                'player_one_id' => $p1->getKey(),
                'player_two_id' => $p2->getKey(),
                'status' => GameStatus::Completed,
                'winner_id' => $p1->getKey(),
            ]);
            $rivalry = $service->recordRematch($game);
        }

        $this->assertSame(3, $rivalry->consecutive_rematches);
        $this->assertSame(3, $rivalry->total_games);
    }
}
