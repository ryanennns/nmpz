<?php

namespace Tests\Feature;

use App\Models\EloHistory;
use App\Models\Game;
use App\Models\Player;
use App\Models\PlayerStats;
use App\Services\EloCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EloCalculatorTest extends TestCase
{
    use RefreshDatabase;

    private function completedGame(array $overrides = []): Game
    {
        return Game::factory()->create(array_merge([
            'status' => \App\Enums\GameStatus::Completed,
        ], $overrides));
    }

    // --- Basic ELO calculation ---

    public function test_winner_gains_elo_and_loser_loses_elo(): void
    {
        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $game = $this->completedGame([
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'winner_id' => $p1->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
        ]);

        EloCalculator::calculate($game);

        $p1->refresh();
        $p2->refresh();

        $this->assertGreaterThan(1000, $p1->elo_rating);
        $this->assertLessThan(1000, $p2->elo_rating);
    }

    public function test_draw_keeps_equal_ratings_unchanged(): void
    {
        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $game = $this->completedGame([
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'winner_id' => null,
            'player_one_health' => 2500,
            'player_two_health' => 2500,
        ]);

        EloCalculator::calculate($game);

        $p1->refresh();
        $p2->refresh();

        $this->assertSame(1000, $p1->elo_rating);
        $this->assertSame(1000, $p2->elo_rating);
    }

    public function test_upset_win_produces_larger_rating_change(): void
    {
        $underdog = Player::factory()->withElo(800)->create();
        $favorite = Player::factory()->withElo(1200)->create();

        $game = $this->completedGame([
            'player_one_id' => $underdog->getKey(),
            'player_two_id' => $favorite->getKey(),
            'winner_id' => $underdog->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
        ]);

        EloCalculator::calculate($game);

        $underdogGain = $underdog->fresh()->elo_rating - 800;
        $favoriteLoss = 1200 - $favorite->fresh()->elo_rating;

        // Upset should produce significant gain
        $this->assertGreaterThan(20, $underdogGain);
        $this->assertGreaterThan(20, $favoriteLoss);
    }

    public function test_expected_win_produces_smaller_rating_change(): void
    {
        $favorite = Player::factory()->withElo(1200)->create();
        $underdog = Player::factory()->withElo(800)->create();

        $game = $this->completedGame([
            'player_one_id' => $favorite->getKey(),
            'player_two_id' => $underdog->getKey(),
            'winner_id' => $favorite->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
        ]);

        EloCalculator::calculate($game);

        $favoriteGain = $favorite->fresh()->elo_rating - 1200;

        // Expected win should produce modest gain
        $this->assertLessThan(20, $favoriteGain);
    }

    // --- ELO floor ---

    public function test_elo_cannot_drop_below_floor(): void
    {
        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(100)->create(); // At the floor

        $game = $this->completedGame([
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'winner_id' => $p1->getKey(),
            'player_one_health' => 5000,
            'player_two_health' => 0,
        ]);

        EloCalculator::calculate($game);

        $p2->refresh();
        $this->assertGreaterThanOrEqual(config('game.elo_floor'), $p2->elo_rating);
    }

    // --- Health margin bonus ---

    public function test_dominant_win_produces_larger_change_than_close_win(): void
    {
        // Dominant win (high health remaining)
        $p1a = Player::factory()->withElo(1000)->create();
        $p2a = Player::factory()->withElo(1000)->create();
        $dominantGame = $this->completedGame([
            'player_one_id' => $p1a->getKey(),
            'player_two_id' => $p2a->getKey(),
            'winner_id' => $p1a->getKey(),
            'player_one_health' => 5000,
            'player_two_health' => 0,
        ]);
        EloCalculator::calculate($dominantGame);
        $dominantGain = $p1a->fresh()->elo_rating - 1000;

        // Close win (low health remaining)
        $p1b = Player::factory()->withElo(1000)->create();
        $p2b = Player::factory()->withElo(1000)->create();
        $closeGame = $this->completedGame([
            'player_one_id' => $p1b->getKey(),
            'player_two_id' => $p2b->getKey(),
            'winner_id' => $p1b->getKey(),
            'player_one_health' => 100,
            'player_two_health' => 0,
        ]);
        EloCalculator::calculate($closeGame);
        $closeGain = $p1b->fresh()->elo_rating - 1000;

        $this->assertGreaterThan($closeGain, $dominantGain);
    }

    // --- K-factor ---

    public function test_new_player_has_higher_k_factor(): void
    {
        // New player (no games)
        $newPlayer = Player::factory()->withElo(1000)->create();
        $opponent1 = Player::factory()->withElo(1000)->create();

        $game1 = $this->completedGame([
            'player_one_id' => $newPlayer->getKey(),
            'player_two_id' => $opponent1->getKey(),
            'winner_id' => $newPlayer->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
        ]);
        EloCalculator::calculate($game1);
        $newPlayerGain = $newPlayer->fresh()->elo_rating - 1000;

        // Experienced player (10+ games)
        $expPlayer = Player::factory()->withElo(1000)->create();
        PlayerStats::create([
            'player_id' => $expPlayer->getKey(),
            'games_played' => 15,
        ]);
        $opponent2 = Player::factory()->withElo(1000)->create();

        $game2 = $this->completedGame([
            'player_one_id' => $expPlayer->getKey(),
            'player_two_id' => $opponent2->getKey(),
            'winner_id' => $expPlayer->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
        ]);
        EloCalculator::calculate($game2);
        $expPlayerGain = $expPlayer->fresh()->elo_rating - 1000;

        $this->assertGreaterThan($expPlayerGain, $newPlayerGain);
    }

    // --- ELO history records ---

    public function test_elo_history_is_created_for_both_players(): void
    {
        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $game = $this->completedGame([
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'winner_id' => $p1->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
        ]);

        EloCalculator::calculate($game);

        $this->assertDatabaseHas('elo_history', [
            'player_id' => $p1->getKey(),
            'game_id' => $game->getKey(),
            'rating_before' => 1000,
        ]);

        $this->assertDatabaseHas('elo_history', [
            'player_id' => $p2->getKey(),
            'game_id' => $game->getKey(),
            'rating_before' => 1000,
        ]);
    }

    public function test_elo_history_records_correct_change(): void
    {
        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $game = $this->completedGame([
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'winner_id' => $p1->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
        ]);

        EloCalculator::calculate($game);

        $p1History = EloHistory::where('player_id', $p1->getKey())->first();
        $this->assertSame(1000, $p1History->rating_before);
        $this->assertSame($p1->fresh()->elo_rating, $p1History->rating_after);
        $this->assertSame($p1->fresh()->elo_rating - 1000, $p1History->rating_change);
        $this->assertSame(1000, $p1History->opponent_rating);
    }

    // --- Rating changes stored on game ---

    public function test_rating_changes_are_stored_on_game(): void
    {
        $p1 = Player::factory()->withElo(1000)->create();
        $p2 = Player::factory()->withElo(1000)->create();

        $game = $this->completedGame([
            'player_one_id' => $p1->getKey(),
            'player_two_id' => $p2->getKey(),
            'winner_id' => $p1->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
        ]);

        EloCalculator::calculate($game);

        $game->refresh();
        $this->assertNotNull($game->player_one_rating_change);
        $this->assertNotNull($game->player_two_rating_change);
        $this->assertGreaterThan(0, $game->player_one_rating_change);
        $this->assertLessThan(0, $game->player_two_rating_change);
    }

    public function test_high_elo_experienced_player_uses_lowest_k_factor(): void
    {
        // Experienced player with high ELO (k_factor_high = 24)
        $highElo = Player::factory()->withElo(1500)->create();
        PlayerStats::create([
            'player_id' => $highElo->getKey(),
            'games_played' => 20,
        ]);
        $opponent = Player::factory()->withElo(1500)->create();

        $game = $this->completedGame([
            'player_one_id' => $highElo->getKey(),
            'player_two_id' => $opponent->getKey(),
            'winner_id' => $highElo->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
        ]);

        EloCalculator::calculate($game);

        $gain = $highElo->fresh()->elo_rating - 1500;
        // k_factor_high = 24, so the gain should be smaller than k_factor_new (40) would give
        $this->assertGreaterThan(0, $gain);
        $this->assertLessThanOrEqual(24, $gain); // Can't gain more than K-factor
    }

    // --- Edge cases ---

    public function test_does_nothing_when_player_not_found(): void
    {
        $p1 = Player::factory()->withElo(1000)->create();

        // Build a game model in memory with a nonexistent player_two_id
        // to simulate a missing player without hitting FK constraints
        $game = new Game();
        $game->forceFill([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'player_one_id' => $p1->getKey(),
            'player_two_id' => 'nonexistent-id',
            'winner_id' => $p1->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
            'status' => \App\Enums\GameStatus::Completed,
        ]);

        // Should not throw — gracefully returns when a player is missing
        EloCalculator::calculate($game);

        $p1->refresh();
        $this->assertSame(1000, $p1->elo_rating);
    }
}
