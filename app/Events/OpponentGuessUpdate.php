<?php

namespace App\Events;

use App\Models\Game;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class OpponentGuessUpdate implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Game $game,
        public readonly string $playerId,
        public readonly float $lat,
        public readonly float $lng,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("game.{$this->game->getKey()}");
    }

    public function broadcastAs(): string
    {
        return 'OpponentGuessUpdate';
    }

    public function broadcastWith(): array
    {
        return [
            'player_id' => $this->playerId,
            'lat' => $this->lat,
            'lng' => $this->lng,
        ];
    }
}
