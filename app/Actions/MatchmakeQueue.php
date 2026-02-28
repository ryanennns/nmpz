<?php

namespace App\Actions;

use App\Models\Player;
use App\Services\QueueService;

class MatchmakeQueue
{
    private const ELO_WINDOW_BASE = 200;
    private const ELO_WINDOW_EXPAND_PER_SECOND = 10;
    private const ELO_WINDOW_MAX = 1000;

    public function __construct(
        private readonly CreateMatch $createMatch,
        private readonly QueueService $queueService,
    ) {}

    public function handle(): int
    {
        $lock = $this->queueService->acquireLock();
        if (! $lock) {
            return 0;
        }

        try {
            $queue = $this->queueService->getQueue();
            $queue = array_values(array_unique($queue));

            if (count($queue) < 2) {
                $this->queueService->setQueue($queue);
                return 0;
            }

            $players = Player::query()->whereIn('id', $queue)->get()->keyBy('id');
            $queue = array_values(array_filter($queue, fn ($id) => $players->has($id)));

            $joinTimes = $this->queueService->getJoinTimes();
            $now = time();

            $matches = 0;
            $matched = [];

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

            $this->queueService->cleanupMatchedPlayers($matched);

            return $matches;
        } finally {
            $lock->release();
        }
    }
}
