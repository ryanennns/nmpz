<?php

namespace App\Events;

use App\Models\Round;
use Illuminate\Foundation\Events\Dispatchable;

class RoundFinished
{
    use Dispatchable;

    public function __construct(
        public readonly Round $round,
    ) {}
}
