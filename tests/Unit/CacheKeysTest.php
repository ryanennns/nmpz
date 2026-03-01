<?php

namespace Tests\Unit;

use App\CacheKeys;
use PHPUnit\Framework\TestCase;

class CacheKeysTest extends TestCase
{
    public function test_season_leaderboard_key(): void
    {
        $key = CacheKeys::seasonLeaderboard('abc-123');
        $this->assertEquals('season_leaderboard_abc-123', $key);
    }

    public function test_daily_leaderboard_key(): void
    {
        $key = CacheKeys::dailyLeaderboard('daily-456');
        $this->assertEquals('daily_leaderboard_daily-456', $key);
    }

    public function test_opponent_guess_throttle_key(): void
    {
        $key = CacheKeys::opponentGuessThrottle('round-1', 'player-1');
        $this->assertEquals('opponent_guess_throttle:round-1:player-1', $key);
    }

    public function test_solo_leaderboard_key_with_map(): void
    {
        $key = CacheKeys::soloLeaderboard('classic', 'map-1');
        $this->assertEquals('solo_leaderboard_classic_map-1', $key);
    }

    public function test_solo_leaderboard_key_without_map(): void
    {
        $key = CacheKeys::soloLeaderboard('streak', null);
        $this->assertEquals('solo_leaderboard_streak_all', $key);
    }

    public function test_constants_are_correct(): void
    {
        $this->assertEquals('matchmaking_queue', CacheKeys::MATCHMAKING_QUEUE);
        $this->assertEquals('matchmaking_queue_times', CacheKeys::MATCHMAKING_QUEUE_TIMES);
        $this->assertEquals('matchmaking_queue_maps', CacheKeys::MATCHMAKING_QUEUE_MAPS);
        $this->assertEquals('matchmaking_queue_formats', CacheKeys::MATCHMAKING_QUEUE_FORMATS);
        $this->assertEquals('matchmaking_queue_lock', CacheKeys::MATCHMAKING_QUEUE_LOCK);
        $this->assertEquals('leaderboard_main', CacheKeys::LEADERBOARD_MAIN);
        $this->assertEquals('maps_active', CacheKeys::MAPS_ACTIVE);
        $this->assertEquals('achievements_all', CacheKeys::ACHIEVEMENTS_ALL);
        $this->assertEquals('achievements_by_key', CacheKeys::ACHIEVEMENTS_BY_KEY);
    }
}
