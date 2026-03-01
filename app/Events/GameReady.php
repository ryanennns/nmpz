<?php

namespace App\Events;

use App\Models\Game;
use App\Models\Player;
use App\Presenters\GamePresenter;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class GameReady implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Game $game,
        public readonly Player $notifyPlayer,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("player.{$this->notifyPlayer->getKey()}");
    }

    public function broadcastAs(): string
    {
        return 'GameReady';
    }

    public function broadcastWith(): array
    {
        $this->game->load(['playerOne.user', 'playerTwo.user']);

        return [
            'game' => GamePresenter::toArray($this->game),
        ];
    }
}
