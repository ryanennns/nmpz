<?php

namespace App\Events;

use App\Models\Game;
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
            'new_game' => [
                'id' => $this->newGame->getKey(),
                'player_one' => [
                    'id' => $this->newGame->player_one_id,
                    'user' => ['name' => $this->newGame->playerOne->user->name],
                    'elo_rating' => $this->newGame->playerOne->elo_rating,
                    'rank' => $this->newGame->playerOne->rank,
                ],
                'player_two' => [
                    'id' => $this->newGame->player_two_id,
                    'user' => ['name' => $this->newGame->playerTwo->user->name],
                    'elo_rating' => $this->newGame->playerTwo->elo_rating,
                    'rank' => $this->newGame->playerTwo->rank,
                ],
                'player_one_health' => $this->newGame->player_one_health,
                'player_two_health' => $this->newGame->player_two_health,
            ],
        ];
    }
}
