<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Http\JsonResponse;

class GetPlayer extends Controller
{
    public function __invoke(Player $player): JsonResponse
    {
        return response()->json($player->toArray(), 200);
    }
}
