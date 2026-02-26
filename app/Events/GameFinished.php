<?php

namespace App\Events;

use App\Models\Game;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class GameFinished implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Game $game,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("game.{$this->game->getKey()}");
    }

    public function broadcastAs(): string
    {
        return 'GameFinished';
    }

    public function broadcastWith(): array
    {
        return [
            'game_id' => $this->game->getKey(),
            'winner_id' => $this->game->winner_id,
            'player_one_health' => $this->game->player_one_health,
            'player_two_health' => $this->game->player_two_health,
        ];
    }
}
