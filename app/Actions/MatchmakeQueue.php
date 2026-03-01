<?php

namespace App\Actions;

use App\Events\GameReady;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Support\Facades\Cache;

class MatchmakeQueue
{
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

                $this->createMatch($p1, $p2);
                $matches++;
            }

            Cache::put('matchmaking_queue', $queue, now()->addMinutes(5));

            return $matches;
        } finally {
            $lock->release();
        }
    }

    private function createMatch(Player $playerOne, Player $playerTwo): void
    {
        $map = Map::query()->where('name', 'likeacw-mapillary')->firstOrFail();
        $locationCount = Location::query()->where('map_id', $map->getKey())->count();
        if ($locationCount === 0) {
            return;
        }

        $seed = random_int(0, $locationCount - 1);

        $game = Game::query()->create([
            'player_one_id' => $playerOne->getKey(),
            'player_two_id' => $playerTwo->getKey(),
            'player_one_health' => 5000,
            'player_two_health' => 5000,
            'map_id' => $map->getKey(),
            'seed' => $seed,
            'status' => GameStatus::InProgress,
        ]);

        $location = Location::query()->where('map_id', $map->getKey())
            ->orderBy('id')
            ->offset($seed % $locationCount)
            ->firstOrFail();

        $round = Round::query()->create([
            'game_id' => $game->getKey(),
            'round_number' => 1,
            'location_id' => $location->getKey(),
        ]);

        GameReady::dispatch($game, $playerOne);
        GameReady::dispatch($game, $playerTwo);
        ForceEndRound::dispatch($round->getKey())->delay(now()->addSeconds(60));
    }
}
