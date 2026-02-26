<?php

namespace App\Http\Controllers;

use App\Events\GameReady;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class JoinQueue extends Controller
{
    public function __invoke(Request $request, Player $player): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
        ]);

        $player->update(['name' => $validated['name']]);
        $player->user()->update(['name' => $validated['name']]);

        $queue = Cache::get('matchmaking_queue', []);
        $queue = array_values(array_filter($queue, fn ($id) => $id !== $player->getKey()));

        $queuedPlayerId = array_shift($queue);
        $queuedPlayer = $queuedPlayerId ? Player::query()->find($queuedPlayerId) : null;

        if ($queuedPlayer) {
            Cache::put('matchmaking_queue', $queue, now()->addMinutes(5));

            $map = Map::query()->firstOrFail();
            $locationCount = Location::query()->where('map_id', $map->getKey())->count();
            $seed = random_int(0, $locationCount - 1);

            $game = Game::factory()->inProgress()->create([
                'player_one_id' => $queuedPlayer->getKey(),
                'player_two_id' => $player->getKey(),
                'map_id' => $map->getKey(),
                'seed' => $seed,
            ]);

            $location = Location::query()->where('map_id', $map->getKey())
                ->orderBy('id')
                ->offset($seed % $locationCount)
                ->firstOrFail();

            $round = Round::factory()->for($game)->create([
                'round_number' => 1,
                'location_lat' => $location->lat,
                'location_lng' => $location->lng,
                'location_heading' => $location->heading,
            ]);

            GameReady::dispatch($game, $queuedPlayer);
            GameReady::dispatch($game, $player);

            $p1Health = $game->player_one_health;
            $p2Health = $game->player_two_health;
            dispatch(function () use ($round, $p1Health, $p2Health) {
                $round->forceFill(['started_at' => now()])->save();
                RoundStarted::dispatch($round, $p1Health, $p2Health);
                ForceEndRound::dispatch($round->getKey())->delay(now()->addSeconds(60));
            })->delay(now()->addSeconds(2));

            return response()->json(['queued' => false]);
        }

        $queue[] = $player->getKey();
        Cache::put('matchmaking_queue', $queue, now()->addMinutes(5));

        return response()->json(['queued' => true]);
    }
}
