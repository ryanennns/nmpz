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
        $this->game->load(['playerOne', 'playerTwo']);

        $data = [
            'game_id' => $this->game->getKey(),
            'winner_id' => $this->game->winner_id,
            'player_one_health' => $this->game->player_one_health,
            'player_two_health' => $this->game->player_two_health,
            'player_one_rating_change' => $this->game->player_one_rating_change,
            'player_two_rating_change' => $this->game->player_two_rating_change,
            'player_one_elo' => $this->game->playerOne?->elo_rating,
            'player_two_elo' => $this->game->playerTwo?->elo_rating,
            'match_format' => $this->game->match_format ?? 'classic',
            'player_one_wins' => $this->game->player_one_wins,
            'player_two_wins' => $this->game->player_two_wins,
        ];

        return $data;
    }
}
