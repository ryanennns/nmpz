<?php

namespace App\Events;

use App\Models\Round;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class RoundFinished implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

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
            'location_lat' => $this->round->location_lat,
            'location_lng' => $this->round->location_lng,
            'player_one_guess_lat' => $this->round->player_one_guess_lat,
            'player_one_guess_lng' => $this->round->player_one_guess_lng,
            'player_two_guess_lat' => $this->round->player_two_guess_lat,
            'player_two_guess_lng' => $this->round->player_two_guess_lng,
            'player_one_score' => $this->round->player_one_score,
            'player_two_score' => $this->round->player_two_score,
        ];
    }
}
