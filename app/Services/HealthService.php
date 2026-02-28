<?php

namespace App\Services;

use App\Models\Game;
use App\Models\Round;

class HealthService
{
    public function deductHealth(Game $game, Round $round): void
    {
        if ($game->isBestOfN()) {
            $this->recordRoundWin($game, $round);
            return;
        }

        $p1 = $round->player_one_score ?? 0;
        $p2 = $round->player_two_score ?? 0;
        $damage = abs($p1 - $p2);

        if ($p1 < $p2) {
            $game->player_one_health -= $damage;
        } elseif ($p2 < $p1) {
            $game->player_two_health -= $damage;
        }

        $game->save();
    }

    private function recordRoundWin(Game $game, Round $round): void
    {
        $p1 = $round->player_one_score ?? 0;
        $p2 = $round->player_two_score ?? 0;

        if ($p1 > $p2) {
            $game->increment('player_one_wins');
        } elseif ($p2 > $p1) {
            $game->increment('player_two_wins');
        }
        // Tie: neither player gets a round win

        $game->refresh();
    }
}
