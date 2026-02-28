<?php

namespace App\Services;

use App\Models\EloHistory;
use App\Models\Game;
use App\Models\Player;
use App\Models\PlayerStats;

class EloCalculator
{
    public static function calculate(Game $game): void
    {
        $p1 = Player::find($game->player_one_id);
        $p2 = Player::find($game->player_two_id);

        if (! $p1 || ! $p2) {
            return;
        }

        $p1Rating = $p1->elo_rating;
        $p2Rating = $p2->elo_rating;

        // Expected scores (standard ELO formula)
        $expected1 = 1 / (1 + pow(10, ($p2Rating - $p1Rating) / 400));
        $expected2 = 1 - $expected1;

        // Actual scores: 1 for win, 0.5 for draw, 0 for loss
        if ($game->winner_id === null) {
            $actual1 = 0.5;
            $actual2 = 0.5;
        } elseif ($game->winner_id === $p1->getKey()) {
            $actual1 = 1;
            $actual2 = 0;
        } else {
            $actual1 = 0;
            $actual2 = 1;
        }

        // K-factor: higher for newer players, lower for experienced
        $k1 = self::kFactor($p1);
        $k2 = self::kFactor($p2);

        // Margin bonus: scale K up to 50% for dominant wins
        $marginMultiplier = 1.0;
        if ($game->winner_id !== null) {
            if ($game->isBestOfN()) {
                // For bo-N: use win differential
                $maxWins = $game->winsNeeded() ?? 1;
                $winnerWins = $game->winner_id === $p1->getKey()
                    ? $game->player_one_wins
                    : $game->player_two_wins;
                $loserWins = $game->winner_id === $p1->getKey()
                    ? $game->player_two_wins
                    : $game->player_one_wins;
                $differential = ($winnerWins - $loserWins) / max(1, $maxWins);
                $marginMultiplier = 1.0 + 0.5 * $differential;
            } else {
                $winnerHealth = $game->winner_id === $p1->getKey()
                    ? $game->player_one_health
                    : $game->player_two_health;
                $maxHealth = config('game.max_health');
                $marginMultiplier = 1.0 + 0.5 * ($winnerHealth / $maxHealth);
            }
        }

        $change1 = (int) round($k1 * $marginMultiplier * ($actual1 - $expected1));
        $change2 = (int) round($k2 * $marginMultiplier * ($actual2 - $expected2));

        $eloFloor = config('game.elo_floor');
        $new1 = max($eloFloor, $p1Rating + $change1);
        $new2 = max($eloFloor, $p2Rating + $change2);

        $p1->update(['elo_rating' => $new1]);
        $p2->update(['elo_rating' => $new2]);

        EloHistory::create([
            'player_id' => $p1->getKey(),
            'game_id' => $game->getKey(),
            'rating_before' => $p1Rating,
            'rating_after' => $new1,
            'rating_change' => $new1 - $p1Rating,
            'opponent_rating' => $p2Rating,
        ]);

        EloHistory::create([
            'player_id' => $p2->getKey(),
            'game_id' => $game->getKey(),
            'rating_before' => $p2Rating,
            'rating_after' => $new2,
            'rating_change' => $new2 - $p2Rating,
            'opponent_rating' => $p1Rating,
        ]);

        // Store rating changes on the game for broadcasting
        $game->update([
            'player_one_rating_change' => $new1 - $p1Rating,
            'player_two_rating_change' => $new2 - $p2Rating,
        ]);
    }

    private static function kFactor(Player $player): int
    {
        $stats = PlayerStats::where('player_id', $player->getKey())->first();
        $gamesPlayed = $stats?->games_played ?? 0;

        if ($gamesPlayed < config('game.k_factor_games_threshold')) {
            return config('game.k_factor_new');
        }

        if ($player->elo_rating < config('game.k_factor_elo_threshold')) {
            return config('game.k_factor_mid');
        }

        return config('game.k_factor_high');
    }
}
