<?php

namespace Tests\Unit;

use App\Enums\GameStatus;
use App\Models\EloHistory;
use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\PlayerStats;
use App\Models\Round;
use App\Models\User;
use App\Services\ScoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelTest extends TestCase
{
    use RefreshDatabase;

    // --- Game Model ---

    public function test_game_has_map_relationship(): void
    {
        $game = Game::factory()->create();

        $this->assertInstanceOf(Map::class, $game->map);
    }

    public function test_game_has_player_one_relationship(): void
    {
        $game = Game::factory()->create();

        $this->assertInstanceOf(Player::class, $game->playerOne);
    }

    public function test_game_has_player_two_relationship(): void
    {
        $game = Game::factory()->create();

        $this->assertInstanceOf(Player::class, $game->playerTwo);
    }

    public function test_game_has_winner_relationship(): void
    {
        $game = Game::factory()->create();
        $game->update(['winner_id' => $game->player_one_id]);

        $this->assertInstanceOf(Player::class, $game->winner);
    }

    public function test_game_has_rounds_relationship(): void
    {
        $game = Game::factory()->create();
        Round::factory()->for($game)->create(['round_number' => 1]);

        $this->assertCount(1, $game->rounds);
    }

    public function test_game_player_one_score(): void
    {
        $game = Game::factory()->create();
        Round::factory()->for($game)->create(['round_number' => 1, 'player_one_score' => 3000]);
        Round::factory()->for($game)->create(['round_number' => 2, 'player_one_score' => 2000]);

        $this->assertSame(5000, $game->playerOneScore());
    }

    public function test_game_player_two_score(): void
    {
        $game = Game::factory()->create();
        Round::factory()->for($game)->create(['round_number' => 1, 'player_two_score' => 4000]);
        Round::factory()->for($game)->create(['round_number' => 2, 'player_two_score' => 1000]);

        $this->assertSame(5000, $game->playerTwoScore());
    }

    public function test_game_casts_status(): void
    {
        $game = Game::factory()->create(['status' => GameStatus::InProgress]);

        $this->assertSame(GameStatus::InProgress, $game->status);
    }

    public function test_game_casts_booleans(): void
    {
        $game = Game::factory()->create([
            'player_one_rematch_requested' => true,
            'player_two_rematch_requested' => false,
        ]);

        $this->assertTrue($game->player_one_rematch_requested);
        $this->assertFalse($game->player_two_rematch_requested);
    }

    // --- Player Model ---

    public function test_player_has_user_relationship(): void
    {
        $player = Player::factory()->create();

        $this->assertInstanceOf(User::class, $player->user);
    }

    public function test_player_has_games_as_player_one(): void
    {
        $player = Player::factory()->create();
        Game::factory()->create(['player_one_id' => $player->getKey()]);

        $this->assertCount(1, $player->gamesAsPlayerOne);
    }

    public function test_player_has_games_as_player_two(): void
    {
        $player = Player::factory()->create();
        Game::factory()->create(['player_two_id' => $player->getKey()]);

        $this->assertCount(1, $player->gamesAsPlayerTwo);
    }

    public function test_player_has_won_games(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create([
            'player_one_id' => $player->getKey(),
            'winner_id' => $player->getKey(),
        ]);

        $this->assertCount(1, $player->wonGames);
    }

    public function test_player_games_query(): void
    {
        $player = Player::factory()->create();
        Game::factory()->create(['player_one_id' => $player->getKey()]);
        Game::factory()->create(['player_two_id' => $player->getKey()]);

        $this->assertSame(2, $player->games()->count());
    }

    public function test_player_stats_relationship(): void
    {
        $player = Player::factory()->create();
        PlayerStats::create(['player_id' => $player->getKey()]);

        $this->assertInstanceOf(PlayerStats::class, $player->stats);
    }

    public function test_player_elo_history_relationship(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        EloHistory::create([
            'player_id' => $player->getKey(),
            'game_id' => $game->getKey(),
            'rating_before' => 1000,
            'rating_after' => 1025,
            'rating_change' => 25,
            'opponent_rating' => 1000,
        ]);

        $this->assertCount(1, $player->eloHistory);
    }

    public function test_player_rank_attribute(): void
    {
        $this->assertSame('Bronze', Player::factory()->withElo(500)->create()->rank);
        $this->assertSame('Silver', Player::factory()->withElo(800)->create()->rank);
        $this->assertSame('Gold', Player::factory()->withElo(1100)->create()->rank);
        $this->assertSame('Platinum', Player::factory()->withElo(1400)->create()->rank);
        $this->assertSame('Diamond', Player::factory()->withElo(1700)->create()->rank);
        $this->assertSame('Master', Player::factory()->withElo(2000)->create()->rank);
    }

    public function test_player_has_active_game(): void
    {
        $player = Player::factory()->create();

        $this->assertFalse($player->hasActiveGame());

        Game::factory()->inProgress()->create(['player_one_id' => $player->getKey()]);

        $this->assertTrue($player->hasActiveGame());
    }

    public function test_player_has_active_game_as_player_two(): void
    {
        $player = Player::factory()->create();
        Game::factory()->inProgress()->create(['player_two_id' => $player->getKey()]);

        $this->assertTrue($player->hasActiveGame());
    }

    // --- Round Model ---

    public function test_round_game_relationship(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create();

        $this->assertInstanceOf(Game::class, $round->game);
    }

    public function test_round_evaluate_scores(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'location_lat' => 48.8566,
            'location_lng' => 2.3522,
            'player_one_guess_lat' => 48.8566,
            'player_one_guess_lng' => 2.3522,
            'player_two_guess_lat' => 51.5074,
            'player_two_guess_lng' => -0.1278,
        ]);

        $round->evaluateScores();

        $this->assertSame(5000, $round->player_one_score);
        $this->assertNotNull($round->player_two_score);
        $this->assertGreaterThan(0, $round->player_two_score);
    }

    public function test_round_evaluate_scores_with_null_guesses(): void
    {
        $game = Game::factory()->create();
        $round = Round::factory()->for($game)->create([
            'player_one_guess_lat' => null,
            'player_one_guess_lng' => null,
            'player_two_guess_lat' => null,
            'player_two_guess_lng' => null,
        ]);

        $round->evaluateScores();

        $this->assertNull($round->player_one_score);
        $this->assertNull($round->player_two_score);
    }

    public function test_round_calculate_score_perfect(): void
    {
        $score = ScoringService::calculateScore(48.8566, 2.3522, 48.8566, 2.3522);

        $this->assertSame(5000, $score);
    }

    public function test_round_calculate_score_decreases_with_distance(): void
    {
        $close = ScoringService::calculateScore(48.8566, 2.3522, 48.86, 2.35);
        $far = ScoringService::calculateScore(48.8566, 2.3522, 51.5074, -0.1278);

        $this->assertGreaterThan($far, $close);
    }

    public function test_round_haversine_distance(): void
    {
        $distance = ScoringService::haversineDistanceKm(48.8566, 2.3522, 48.8566, 2.3522);

        $this->assertEqualsWithDelta(0, $distance, 0.001);
    }

    // --- Map Model ---

    public function test_map_has_locations(): void
    {
        $map = Map::factory()->create();

        $this->assertCount(1, $map->locations); // MapFactory creates 1 location
    }

    // --- EloHistory Model ---

    public function test_elo_history_player_relationship(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $history = EloHistory::create([
            'player_id' => $player->getKey(),
            'game_id' => $game->getKey(),
            'rating_before' => 1000,
            'rating_after' => 1025,
            'rating_change' => 25,
            'opponent_rating' => 1000,
        ]);

        $this->assertInstanceOf(Player::class, $history->player);
    }

    public function test_elo_history_game_relationship(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $history = EloHistory::create([
            'player_id' => $player->getKey(),
            'game_id' => $game->getKey(),
            'rating_before' => 1000,
            'rating_after' => 1025,
            'rating_change' => 25,
            'opponent_rating' => 1000,
        ]);

        $this->assertInstanceOf(Game::class, $history->game);
    }

    public function test_elo_history_casts(): void
    {
        $player = Player::factory()->create();
        $game = Game::factory()->create(['player_one_id' => $player->getKey()]);
        $history = EloHistory::create([
            'player_id' => $player->getKey(),
            'game_id' => $game->getKey(),
            'rating_before' => 1000,
            'rating_after' => 1025,
            'rating_change' => 25,
            'opponent_rating' => 1000,
        ]);

        $this->assertIsInt($history->rating_before);
        $this->assertIsInt($history->rating_after);
        $this->assertIsInt($history->rating_change);
        $this->assertIsInt($history->opponent_rating);
    }

    // --- User Model ---

    public function test_user_has_player_relationship(): void
    {
        $player = Player::factory()->create();
        $user = $player->user;

        $this->assertInstanceOf(Player::class, $user->player);
    }

    public function test_user_casts(): void
    {
        $user = User::factory()->create();

        $this->assertIsString($user->password);
    }

    // --- Location Model ---

    public function test_location_has_map_relationship(): void
    {
        $map = Map::factory()->create();
        $location = $map->locations->first();

        $this->assertInstanceOf(Map::class, $location->map);
    }

    public function test_location_casts(): void
    {
        $map = Map::factory()->create();
        $location = $map->locations->first();

        $this->assertIsFloat($location->lat);
        $this->assertIsFloat($location->lng);
        $this->assertIsInt($location->heading);
    }

    // --- PlayerStats Model ---

    public function test_player_stats_win_rate(): void
    {
        $player = Player::factory()->create();
        $stats = PlayerStats::create([
            'player_id' => $player->getKey(),
            'games_played' => 10,
            'games_won' => 7,
        ]);

        $this->assertSame(70.0, $stats->win_rate);
    }

    public function test_player_stats_win_rate_zero_games(): void
    {
        $player = Player::factory()->create();
        $stats = PlayerStats::create([
            'player_id' => $player->getKey(),
            'games_played' => 0,
            'games_won' => 0,
        ]);

        $this->assertSame(0.0, $stats->win_rate);
    }

    public function test_player_stats_average_score(): void
    {
        $player = Player::factory()->create();
        $stats = PlayerStats::create([
            'player_id' => $player->getKey(),
            'total_rounds' => 10,
            'total_score' => 35000,
        ]);

        $this->assertSame(3500.0, $stats->average_score);
    }

    public function test_player_stats_average_score_zero_rounds(): void
    {
        $player = Player::factory()->create();
        $stats = PlayerStats::create([
            'player_id' => $player->getKey(),
            'total_rounds' => 0,
            'total_score' => 0,
        ]);

        $this->assertSame(0.0, $stats->average_score);
    }

    public function test_player_stats_average_distance(): void
    {
        $player = Player::factory()->create();
        $stats = PlayerStats::create([
            'player_id' => $player->getKey(),
            'total_guesses_made' => 10,
            'total_distance_km' => 500.0,
        ]);

        $this->assertSame(50.0, $stats->average_distance_km);
    }

    public function test_player_stats_average_distance_zero_guesses(): void
    {
        $player = Player::factory()->create();
        $stats = PlayerStats::create([
            'player_id' => $player->getKey(),
            'total_guesses_made' => 0,
            'total_distance_km' => 0,
        ]);

        $this->assertSame(0.0, $stats->average_distance_km);
    }

    public function test_player_stats_player_relationship(): void
    {
        $player = Player::factory()->create();
        $stats = PlayerStats::create(['player_id' => $player->getKey()]);

        $this->assertInstanceOf(Player::class, $stats->player);
    }
}
