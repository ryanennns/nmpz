<?php

namespace App\Actions;

use App\Events\GameReady;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Location;
use App\Models\Map;
use App\Models\Player;
use App\Models\Round;

class CreateMatch
{
    public function handle(Player $playerOne, Player $playerTwo, ?string $mapId = null, string $matchFormat = 'classic'): Game
    {
        $map = $mapId
            ? Map::query()->findOrFail($mapId)
            : Map::query()->where('name', config('game.default_map'))->firstOrFail();

        $locationCount = Location::query()->where('map_id', $map->getKey())->count();

        abort_if($locationCount === 0, 500, 'No locations available.');

        $seed = random_int(0, $locationCount - 1);

        $maxRounds = match ($matchFormat) {
            'bo3' => 3,
            'bo5' => 5,
            'bo7' => 7,
            'rush' => config('game.rush_max_rounds'),
            default => null,
        };

        $isBestOfN = ! in_array($matchFormat, ['classic', 'rush']);

        $game = Game::factory()->inProgress()->create([
            'player_one_id' => $playerOne->getKey(),
            'player_two_id' => $playerTwo->getKey(),
            'map_id' => $map->getKey(),
            'seed' => $seed,
            'match_format' => $matchFormat,
            'max_rounds' => $maxRounds,
            'player_one_health' => $isBestOfN ? 0 : config('game.max_health'),
            'player_two_health' => $isBestOfN ? 0 : config('game.max_health'),
        ]);

        $location = Location::query()->where('map_id', $map->getKey())
            ->orderBy('id')
            ->offset($seed % $locationCount)
            ->firstOrFail();

        Round::factory()->for($game)->create([
            'round_number' => 1,
            'location_lat' => $location->lat,
            'location_lng' => $location->lng,
            'location_heading' => $location->heading,
        ]);

        GameReady::dispatch($game, $playerOne);
        GameReady::dispatch($game, $playerTwo);

        $round = $game->rounds()->first();
        $p1Health = $game->player_one_health;
        $p2Health = $game->player_two_health;
        $timeoutSeconds = $game->roundTimeoutSeconds();
        dispatch(function () use ($round, $p1Health, $p2Health, $timeoutSeconds) {
            $round->forceFill(['started_at' => now()])->save();
            RoundStarted::dispatch($round, $p1Health, $p2Health);
            ForceEndRound::dispatch($round->getKey())->delay(now()->addSeconds($timeoutSeconds));
        })->delay(now()->addSeconds(2));

        return $game;
    }
}
