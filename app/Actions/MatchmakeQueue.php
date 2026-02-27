<?php

namespace App\Actions;

use App\Models\Player;
use Illuminate\Support\Facades\Cache;

class MatchmakeQueue
{
    public function __construct(
        private readonly CreateMatch $createMatch,
    ) {}

    public function handle(): int
    {
        $lock = Cache::lock('matchmaking_queue_lock', 10);
        if (! $lock->get()) {
            return 0;
        }

        try {
            $queue = Cache::get('matchmaking_queue', []);
            $queue = array_values(array_unique($queue));

            if (count($queue) < 2) {
                Cache::put('matchmaking_queue', $queue, now()->addMinutes(5));
                return 0;
            }

            $players = Player::query()->whereIn('id', $queue)->get()->keyBy('id');
            $queue = array_values(array_filter($queue, fn ($id) => $players->has($id)));

            $matches = 0;

            while (count($queue) >= 2) {
                $p1Id = array_shift($queue);
                $p2Id = array_shift($queue);
                $p1 = $players->get($p1Id);
                $p2 = $players->get($p2Id);

                if (! $p1 || ! $p2) {
                    continue;
                }

                $this->createMatch->handle($p1, $p2);
                $matches++;
            }

            Cache::put('matchmaking_queue', $queue, now()->addMinutes(5));

            return $matches;
        } finally {
            $lock->release();
        }
    }
}
