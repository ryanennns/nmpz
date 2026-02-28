<?php

namespace App\Events;

use App\Models\Achievement;
use App\Models\Player;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class AchievementEarned implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public readonly Player $player,
        public readonly Achievement $achievement,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("player.{$this->player->getKey()}");
    }

    public function broadcastAs(): string
    {
        return 'AchievementEarned';
    }

    public function broadcastWith(): array
    {
        return [
            'key' => $this->achievement->key,
            'name' => $this->achievement->name,
            'description' => $this->achievement->description,
            'icon' => $this->achievement->icon,
        ];
    }
}
