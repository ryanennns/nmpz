<?php

namespace App\Listeners;

use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Models\Round;
use Illuminate\Contracts\Queue\ShouldQueue;

class StartNextRound implements ShouldQueue
{
    public int $delay = 3;

    public function handle(RoundFinished $event): void
    {
        $finished = $event->round;

        $next = Round::query()->create([
            'game_id' => $finished->game_id,
            'round_number' => $finished->round_number + 1,
            'location_lat' => $this->pickLocationLat(),
            'location_lng' => $this->pickLocationLng(),
        ]);

        RoundStarted::dispatch($next);
    }

    private function pickLocationLat(): float
    {
        return fake()->latitude();
    }

    private function pickLocationLng(): float
    {
        return fake()->longitude();
    }
}
