<?php

namespace App\Observers;

use App\Models\SoloGame;

class SoloGameObserver
{
    public function updating(SoloGame $game): void
    {
        if ($game->status === SoloGame::STATUS_COMPLETED) {
            $game->score = $game->rounds()->sum('score');
        }
    }
}
