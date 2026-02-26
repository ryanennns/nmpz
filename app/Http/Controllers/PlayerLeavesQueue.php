<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

class PlayerLeavesQueue extends Controller
{
    public function __invoke(Player $player): Response
    {
        $queue = Cache::get('matchmaking_queue', []);
        $updated = array_values(array_filter($queue, fn ($id) => $id !== $player->getKey()));
        Cache::put('matchmaking_queue', $updated, now()->addMinutes(5));

        return response()->noContent();
    }
}
