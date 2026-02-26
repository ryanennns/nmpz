<?php

namespace App\Events;

use App\Models\Round;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class RoundFinished implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly Round $round,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("game.{$this->round->game_id}");
    }

    public function broadcastAs(): string
    {
        return 'RoundFinished';
    }

    public function broadcastWith(): array
    {
        return [
            'game_id' => $this->round->game_id,
            'round_id' => $this->round->getKey(),
            'round_number' => $this->round->round_number,
            'player_one_score' => $this->round->player_one_score,
            'player_two_score' => $this->round->player_two_score,
        ];
    }
}
