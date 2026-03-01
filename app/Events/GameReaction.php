<?php

namespace App\Events;

use App\Models\Game;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class GameReaction implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public const ALLOWED_REACTIONS = ['surprised', 'confident', 'thinking', 'gg', 'nice', 'oof'];

    public function __construct(
        public readonly Game $game,
        public readonly string $playerId,
        public readonly string $reaction,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("game.{$this->game->getKey()}");
    }

    public function broadcastAs(): string
    {
        return 'GameReaction';
    }

    public function broadcastWith(): array
    {
        return [
            'game_id' => $this->game->getKey(),
            'player_id' => $this->playerId,
            'reaction' => $this->reaction,
        ];
    }
}
