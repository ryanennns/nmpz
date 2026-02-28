<?php

namespace App\Events;

use App\Models\Round;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class RoundStarted implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Round $round,
        public readonly int $playerOneHealth,
        public readonly int $playerTwoHealth,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("game.{$this->round->game_id}");
    }

    public function broadcastAs(): string
    {
        return 'RoundStarted';
    }

    public function broadcastWith(): array
    {
        $location = $this->round->location;

        return [
            'game_id' => $this->round->game_id,
            'round_id' => $this->round->getKey(),
            'round_number' => $this->round->round_number,
            'player_one_health' => $this->playerOneHealth,
            'player_two_health' => $this->playerTwoHealth,
            'location_lat' => $location->lat,
            'location_lng' => $location->lng,
            'location_heading' => $location->heading,
            'location_image_id' => $location->image_id,
            'started_at' => optional($this->round->started_at)->toISOString(),
        ];
    }
}
