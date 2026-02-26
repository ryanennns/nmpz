<?php

namespace App\Events;

use App\Models\Game;
use App\Models\Player;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class GameReady implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

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
            'game' => [
                'id' => $this->game->getKey(),
                'player_one' => [
                    'id' => $this->game->player_one_id,
                    'user' => ['name' => $this->game->playerOne->user->name],
                ],
                'player_two' => [
                    'id' => $this->game->player_two_id,
                    'user' => ['name' => $this->game->playerTwo->user->name],
                ],
                'player_one_health' => $this->game->player_one_health,
                'player_two_health' => $this->game->player_two_health,
            ],
        ];
    }
}
