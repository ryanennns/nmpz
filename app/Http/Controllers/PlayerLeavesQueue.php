<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Services\QueueService;
use Illuminate\Http\Response;

class PlayerLeavesQueue extends Controller
{
    public function __invoke(Player $player, QueueService $queueService): Response
    {
        $queueService->remove($player->getKey());

        return response()->noContent();
    }
}
