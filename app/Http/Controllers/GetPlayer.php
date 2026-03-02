<?php

namespace App\Http\Controllers;

use App\Http\Resources\PlayerResource;
use App\Models\Player;

class GetPlayer extends Controller
{
    public function __invoke(Player $player): PlayerResource
    {
        return new PlayerResource($player);
    }
}
