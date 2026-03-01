<?php

namespace App\Events;

use App\Models\Game;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class SpectatorChatMessage implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Game $game,
        public readonly string $playerName,
        public readonly string $message,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("game.{$this->game->getKey()}.spectators");
    }

    public function broadcastAs(): string
    {
        return 'SpectatorChatMessage';
    }

    public function broadcastWith(): array
    {
        return [
            'game_id' => $this->game->getKey(),
            'player_name' => $this->playerName,
            'message' => $this->message,
        ];
    }
}
