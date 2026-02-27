<?php

namespace App\Events;

use App\Models\Game;
use App\Models\Player;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class RematchRequested implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Game $game,
        public readonly Player $player,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("game.{$this->game->getKey()}");
    }

    public function broadcastAs(): string
    {
        return 'RematchRequested';
    }

    public function broadcastWith(): array
    {
        return [
            'game_id' => $this->game->getKey(),
            'player_id' => $this->player->getKey(),
            'player_name' => $this->player->user?->name ?? $this->player->name ?? 'Player',
        ];
    }
}
