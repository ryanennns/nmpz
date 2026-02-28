<?php

namespace App\Services;

use App\Models\Game;
use App\Models\Rivalry;

class RivalryService
{
    public function recordRematch(Game $game): Rivalry
    {
        $rivalry = Rivalry::findOrCreateBetween($game->player_one_id, $game->player_two_id);

        $rivalry->increment('consecutive_rematches');
        $rivalry->increment('total_games');

        if ($game->winner_id) {
            if ($game->winner_id === $rivalry->player_one_id) {
                $rivalry->increment('player_one_wins');
            } else {
                $rivalry->increment('player_two_wins');
            }
        }

        $rivalry->refresh();

        return $rivalry;
    }

    public function resetStreak(string $playerOneId, string $playerTwoId): void
    {
        $rivalry = Rivalry::findOrCreateBetween($playerOneId, $playerTwoId);
        $rivalry->update(['consecutive_rematches' => 0]);
    }

    public function eloBonusMultiplier(Rivalry $rivalry): float
    {
        $streak = $rivalry->consecutive_rematches;

        if ($streak >= 5) {
            return 1.5;
        }
        if ($streak >= 3) {
            return 1.25;
        }

        return 1.0;
    }
}
