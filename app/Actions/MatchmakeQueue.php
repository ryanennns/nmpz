<?php

namespace App\Actions;

use App\Models\Player;
use Illuminate\Support\Facades\Cache;

class MatchmakeQueue
{
    private const ELO_WINDOW_BASE = 200;
    private const ELO_WINDOW_EXPAND_PER_SECOND = 10;
    private const ELO_WINDOW_MAX = 1000;

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

            // Track when each player joined the queue for window expansion
            $joinTimes = Cache::get('matchmaking_queue_times', []);
            $now = time();

            $matches = 0;
            $matched = [];

            // Sort by ELO so we try to match nearby ratings first
            usort($queue, fn ($a, $b) => ($players->get($a)?->elo_rating ?? 1000) - ($players->get($b)?->elo_rating ?? 1000));

            for ($i = 0; $i < count($queue); $i++) {
                if (isset($matched[$queue[$i]])) {
                    continue;
                }

                $p1Id = $queue[$i];
                $p1 = $players->get($p1Id);
                if (! $p1) {
                    continue;
                }

                $p1Elo = $p1->elo_rating;
                $p1WaitSeconds = $now - ($joinTimes[$p1Id] ?? $now);
                $p1Window = min(
                    self::ELO_WINDOW_MAX,
                    self::ELO_WINDOW_BASE + ($p1WaitSeconds * self::ELO_WINDOW_EXPAND_PER_SECOND),
                );

                $bestMatch = null;
                $bestDiff = PHP_INT_MAX;

                for ($j = $i + 1; $j < count($queue); $j++) {
                    if (isset($matched[$queue[$j]])) {
                        continue;
                    }

                    $p2Id = $queue[$j];
                    $p2 = $players->get($p2Id);
                    if (! $p2) {
                        continue;
                    }

                    $p2Elo = $p2->elo_rating;
                    $p2WaitSeconds = $now - ($joinTimes[$p2Id] ?? $now);
                    $p2Window = min(
                        self::ELO_WINDOW_MAX,
                        self::ELO_WINDOW_BASE + ($p2WaitSeconds * self::ELO_WINDOW_EXPAND_PER_SECOND),
                    );

                    $diff = abs($p1Elo - $p2Elo);

                    // Both players must accept the match (their windows must both cover the diff)
                    if ($diff <= $p1Window && $diff <= $p2Window && $diff < $bestDiff) {
                        $bestMatch = $j;
                        $bestDiff = $diff;
                    }
                }

                if ($bestMatch !== null) {
                    $p2Id = $queue[$bestMatch];
                    $p2 = $players->get($p2Id);

                    $matched[$p1Id] = true;
                    $matched[$p2Id] = true;

                    $this->createMatch->handle($p1, $p2);
                    $matches++;
                }
            }

            $remaining = array_values(array_filter($queue, fn ($id) => ! isset($matched[$id])));
            Cache::put('matchmaking_queue', $remaining, now()->addMinutes(5));

            // Clean up join times for matched players
            foreach ($matched as $id => $_) {
                unset($joinTimes[$id]);
            }
            Cache::put('matchmaking_queue_times', $joinTimes, now()->addMinutes(5));

            return $matches;
        } finally {
            $lock->release();
        }
    }
}
