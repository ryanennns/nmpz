<?php

namespace App;

class CacheKeys
{
    public const MATCHMAKING_QUEUE = 'matchmaking_queue';
    public const MATCHMAKING_QUEUE_TIMES = 'matchmaking_queue_times';
    public const MATCHMAKING_QUEUE_MAPS = 'matchmaking_queue_maps';
    public const MATCHMAKING_QUEUE_FORMATS = 'matchmaking_queue_formats';
    public const MATCHMAKING_QUEUE_LOCK = 'matchmaking_queue_lock';

    public const LEADERBOARD_MAIN = 'leaderboard_main';
    public const MAPS_ACTIVE = 'maps_active';
    public const ACHIEVEMENTS_ALL = 'achievements_all';
    public const ACHIEVEMENTS_BY_KEY = 'achievements_by_key';

    public static function seasonLeaderboard(string $seasonId): string
    {
        return "season_leaderboard_{$seasonId}";
    }

    public static function dailyLeaderboard(string $challengeId): string
    {
        return "daily_leaderboard_{$challengeId}";
    }

    public static function opponentGuessThrottle(string $roundId, string $playerId): string
    {
        return "opponent_guess_throttle:{$roundId}:{$playerId}";
    }

    public static function soloLeaderboard(string $mode, ?string $mapId): string
    {
        return "solo_leaderboard_{$mode}_" . ($mapId ?? 'all');
    }
}
