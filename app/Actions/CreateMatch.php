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
    public function handle(Player $playerOne, Player $playerTwo): Game
    {
        $map = Map::query()->where('name', 'likeacw-mapillary')->firstOrFail();
        $locationCount = Location::query()->where('map_id', $map->getKey())->count();

        abort_if($locationCount === 0, 500, 'No locations available.');

        $seed = random_int(0, $locationCount - 1);

        $game = Game::factory()->inProgress()->create([
            'player_one_id' => $playerOne->getKey(),
            'player_two_id' => $playerTwo->getKey(),
            'map_id' => $map->getKey(),
            'seed' => $seed,
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
        dispatch(function () use ($round, $p1Health, $p2Health) {
            $round->forceFill(['started_at' => now()])->save();
            RoundStarted::dispatch($round, $p1Health, $p2Health);
            ForceEndRound::dispatch($round->getKey())->delay(now()->addSeconds(60));
        })->delay(now()->addSeconds(2));

        return $game;
    }
}
