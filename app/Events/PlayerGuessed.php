<?php

namespace App\Events;

use App\Models\Player;
use App\Models\Round;
use Illuminate\Foundation\Events\Dispatchable;

class PlayerGuessed
{
    use Dispatchable;

    public function __construct(
        public readonly Round $round,
        public readonly Player $player,
    ) {}
}
