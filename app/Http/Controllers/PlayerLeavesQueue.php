<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

class PlayerLeavesQueue extends Controller
{
    public function __invoke(Player $player): Response
    {
        if (Cache::get('matchmaking_queue') === $player->getKey()) {
            Cache::forget('matchmaking_queue');
        }

        return response()->noContent();
    }
}
