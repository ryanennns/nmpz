<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class QueueService
{
    private const CACHE_QUEUE = 'matchmaking_queue';
    private const CACHE_TIMES = 'matchmaking_queue_times';
    private const CACHE_MAP_PREFS = 'matchmaking_queue_maps';
    private const CACHE_FORMAT_PREFS = 'matchmaking_queue_formats';
    private const CACHE_TTL_MINUTES = 5;
    public const LOCK_KEY = 'matchmaking_queue_lock';

    public function add(string $playerId): void
    {
        $queue = $this->getQueue();
        $queue = array_values(array_filter($queue, fn ($id) => $id !== $playerId));
        $queue[] = $playerId;
        $queue = array_values(array_unique($queue));
        $this->setQueue($queue);
    }

    public function remove(string $playerId): void
    {
        $queue = $this->getQueue();
        $updated = array_values(array_filter($queue, fn ($id) => $id !== $playerId));
        $this->setQueue($updated);
    }

    public function getQueue(): array
    {
        return Cache::get(self::CACHE_QUEUE, []);
    }

    public function setQueue(array $queue): void
    {
        Cache::put(self::CACHE_QUEUE, $queue, now()->addMinutes(self::CACHE_TTL_MINUTES));
    }

    public function recordJoinTime(string $playerId): void
    {
        $joinTimes = $this->getJoinTimes();
        if (! isset($joinTimes[$playerId])) {
            $joinTimes[$playerId] = time();
            $this->setJoinTimes($joinTimes);
        }
    }

    public function getJoinTimes(): array
    {
        return Cache::get(self::CACHE_TIMES, []);
    }

    public function setJoinTimes(array $joinTimes): void
    {
        Cache::put(self::CACHE_TIMES, $joinTimes, now()->addMinutes(self::CACHE_TTL_MINUTES));
    }

    public function recordMapPreference(string $playerId, ?string $mapId): void
    {
        $prefs = $this->getMapPreferences();
        if ($mapId !== null) {
            $prefs[$playerId] = $mapId;
        } else {
            unset($prefs[$playerId]);
        }
        $this->setMapPreferences($prefs);
    }

    public function getMapPreferences(): array
    {
        return Cache::get(self::CACHE_MAP_PREFS, []);
    }

    public function setMapPreferences(array $prefs): void
    {
        Cache::put(self::CACHE_MAP_PREFS, $prefs, now()->addMinutes(self::CACHE_TTL_MINUTES));
    }

    public function recordFormatPreference(string $playerId, ?string $format): void
    {
        $prefs = $this->getFormatPreferences();
        if ($format !== null && $format !== 'classic') {
            $prefs[$playerId] = $format;
        } else {
            unset($prefs[$playerId]);
        }
        $this->setFormatPreferences($prefs);
    }

    public function getFormatPreferences(): array
    {
        return Cache::get(self::CACHE_FORMAT_PREFS, []);
    }

    public function setFormatPreferences(array $prefs): void
    {
        Cache::put(self::CACHE_FORMAT_PREFS, $prefs, now()->addMinutes(self::CACHE_TTL_MINUTES));
    }

    public function cleanupMatchedPlayers(array $matchedIds): void
    {
        $queue = $this->getQueue();
        $remaining = array_values(array_filter($queue, fn ($id) => ! isset($matchedIds[$id])));
        $this->setQueue($remaining);

        $joinTimes = $this->getJoinTimes();
        $mapPrefs = $this->getMapPreferences();
        $formatPrefs = $this->getFormatPreferences();
        foreach ($matchedIds as $id => $_) {
            unset($joinTimes[$id]);
            unset($mapPrefs[$id]);
            unset($formatPrefs[$id]);
        }
        $this->setJoinTimes($joinTimes);
        $this->setMapPreferences($mapPrefs);
        $this->setFormatPreferences($formatPrefs);
    }

    public function acquireLock(int $seconds = 10): mixed
    {
        $lock = Cache::lock(self::LOCK_KEY, $seconds);

        return $lock->get() ? $lock : null;
    }
}
