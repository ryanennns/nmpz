<?php

namespace App\Events;

use App\Models\Game;
use App\Presenters\GamePresenter;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class RematchAccepted implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Game $oldGame,
        public readonly Game $newGame,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("game.{$this->oldGame->getKey()}");
    }

    public function broadcastAs(): string
    {
        return 'RematchAccepted';
    }

    public function broadcastWith(): array
    {
        $this->newGame->load(['playerOne.user', 'playerTwo.user']);

        return [
            'game_id' => $this->oldGame->getKey(),
            'new_game' => GamePresenter::toArray($this->newGame),
        ];
    }
}
