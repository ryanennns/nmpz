<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Events\AchievementEarned;
use App\Models\Game;
use App\Models\Player;
use App\Models\PlayerAchievement;
use App\Models\PlayerStats;
use App\Services\AchievementService;
use Database\Seeders\AchievementSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class AchievementServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AchievementSeeder::class);
    }

    private function createGameWithWinner(Player $winner, Player $loser, array $overrides = []): Game
    {
        return Game::factory()->create(array_merge([
            'player_one_id' => $winner->getKey(),
            'player_two_id' => $loser->getKey(),
            'status' => GameStatus::Completed,
            'winner_id' => $winner->getKey(),
            'player_one_health' => 3000,
            'player_two_health' => 0,
        ], $overrides));
    }

    public function test_awards_first_win(): void
    {
        Event::fake();
        $winner = Player::factory()->create();
        $loser = Player::factory()->create();
        PlayerStats::create(['player_id' => $winner->getKey(), 'games_won' => 1]);
        $game = $this->createGameWithWinner($winner, $loser);

        app(AchievementService::class)->evaluateAfterGame($game);

        $this->assertDatabaseHas('player_achievements', [
            'player_id' => $winner->getKey(),
        ]);
        $earned = PlayerAchievement::where('player_id', $winner->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'first_win'))
            ->exists();
        $this->assertTrue($earned);
    }

    public function test_awards_win_streak_5(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $other = Player::factory()->create();
        PlayerStats::create(['player_id' => $player->getKey(), 'current_win_streak' => 5]);
        $game = $this->createGameWithWinner($player, $other);

        app(AchievementService::class)->evaluateAfterGame($game);

        $earned = PlayerAchievement::where('player_id', $player->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'win_streak_5'))
            ->exists();
        $this->assertTrue($earned);
    }

    public function test_awards_win_streak_10(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $other = Player::factory()->create();
        PlayerStats::create(['player_id' => $player->getKey(), 'current_win_streak' => 10]);
        $game = $this->createGameWithWinner($player, $other);

        app(AchievementService::class)->evaluateAfterGame($game);

        $earned = PlayerAchievement::where('player_id', $player->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'win_streak_10'))
            ->exists();
        $this->assertTrue($earned);
    }

    public function test_awards_perfect_round(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $other = Player::factory()->create();
        PlayerStats::create(['player_id' => $player->getKey(), 'perfect_rounds' => 1]);
        $game = $this->createGameWithWinner($player, $other);

        app(AchievementService::class)->evaluateAfterGame($game);

        $earned = PlayerAchievement::where('player_id', $player->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'perfect_round'))
            ->exists();
        $this->assertTrue($earned);
    }

    public function test_awards_games_played_10(): void
    {
        Event::fake();
        $player = Player::factory()->create();
        $other = Player::factory()->create();
        PlayerStats::create(['player_id' => $player->getKey(), 'games_played' => 10]);
        $game = $this->createGameWithWinner($player, $other);

        app(AchievementService::class)->evaluateAfterGame($game);

        $earned = PlayerAchievement::where('player_id', $player->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'games_played_10'))
            ->exists();
        $this->assertTrue($earned);
    }

    public function test_awards_reach_gold(): void
    {
        Event::fake();
        $player = Player::factory()->withElo(1100)->create();
        $other = Player::factory()->create();
        $game = $this->createGameWithWinner($player, $other);

        app(AchievementService::class)->evaluateAfterGame($game);

        $earned = PlayerAchievement::where('player_id', $player->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'reach_gold'))
            ->exists();
        $this->assertTrue($earned);
    }

    public function test_awards_reach_diamond(): void
    {
        Event::fake();
        $player = Player::factory()->withElo(1700)->create();
        $other = Player::factory()->create();
        $game = $this->createGameWithWinner($player, $other);

        app(AchievementService::class)->evaluateAfterGame($game);

        $earned = PlayerAchievement::where('player_id', $player->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'reach_diamond'))
            ->exists();
        $this->assertTrue($earned);
    }

    public function test_awards_reach_master(): void
    {
        Event::fake();
        $player = Player::factory()->withElo(2000)->create();
        $other = Player::factory()->create();
        $game = $this->createGameWithWinner($player, $other);

        app(AchievementService::class)->evaluateAfterGame($game);

        $earned = PlayerAchievement::where('player_id', $player->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'reach_master'))
            ->exists();
        $this->assertTrue($earned);
    }

    public function test_awards_flawless_victory(): void
    {
        Event::fake();
        $winner = Player::factory()->create();
        $loser = Player::factory()->create();
        $game = $this->createGameWithWinner($winner, $loser, [
            'player_one_health' => config('game.max_health'),
        ]);

        app(AchievementService::class)->evaluateAfterGame($game);

        $earned = PlayerAchievement::where('player_id', $winner->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'flawless_victory'))
            ->exists();
        $this->assertTrue($earned);
    }

    public function test_awards_comeback_king(): void
    {
        Event::fake();
        $winner = Player::factory()->create();
        $loser = Player::factory()->create();
        $game = $this->createGameWithWinner($winner, $loser, [
            'player_one_health' => 500,
        ]);

        app(AchievementService::class)->evaluateAfterGame($game);

        $earned = PlayerAchievement::where('player_id', $winner->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'comeback_king'))
            ->exists();
        $this->assertTrue($earned);
    }

    public function test_does_not_duplicate_achievements(): void
    {
        Event::fake();
        $winner = Player::factory()->withElo(1100)->create();
        $loser = Player::factory()->create();
        $game = $this->createGameWithWinner($winner, $loser);

        $service = app(AchievementService::class);
        $service->evaluateAfterGame($game);
        $service->evaluateAfterGame($game);

        $count = PlayerAchievement::where('player_id', $winner->getKey())
            ->whereHas('achievement', fn ($q) => $q->where('key', 'reach_gold'))
            ->count();
        $this->assertSame(1, $count);
    }

    public function test_dispatches_achievement_earned_event(): void
    {
        Event::fake();
        $winner = Player::factory()->withElo(1100)->create();
        $loser = Player::factory()->create();
        $game = $this->createGameWithWinner($winner, $loser);

        app(AchievementService::class)->evaluateAfterGame($game);

        Event::assertDispatched(AchievementEarned::class, function (AchievementEarned $e) use ($winner) {
            return $e->player->getKey() === $winner->getKey();
        });
    }
}
