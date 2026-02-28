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
        return [
            'game_id' => $this->round->game_id,
            'round_id' => $this->round->getKey(),
            'round_number' => $this->round->round_number,
            'player_one_health' => $this->playerOneHealth,
            'player_two_health' => $this->playerTwoHealth,
            'location_lat' => $this->round->location_lat,
            'location_lng' => $this->round->location_lng,
            'location_heading' => $this->round->location_heading,
            'location_image_id' => $this->round->location_image_id,
            'started_at' => optional($this->round->started_at)->toISOString(),
        ];
    }
}
