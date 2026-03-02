<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Location;
use App\Models\Player;
use App\Models\Round;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GetGame extends Controller
{
    public function __invoke(Request $request, Game $game)
    {
        $validated = $request->validate(['player' => 'required|string|exists:players,id']);
        $player = Player::query()->find($validated['player']);

        if ($game->status !== GameStatus::InProgress) {
            return redirect("/games/$game->id/summary");
        }

        if (
            $game->status !== GameStatus::InProgress
            || ! in_array($player->getKey(), [$game->player_one_id, $game->player_two_id], true)
        ) {
            abort(422);
        }

        $gameArray = [
            'id' => $game->getKey(),
            'player_one' => [
                'id' => $game->player_one_id,
                'name' => $game->playerOne?->name,
            ],
            'player_two' => [
                'id' => $game->player_two_id,
                'name' => $game->playerTwo?->name,
            ],
            'player_one_health' => $game->player_one_health,
            'player_two_health' => $game->player_two_health,
        ];

        /** @var Round $round */
        $round = $game->rounds()->latest()->first();

        $roundData = [
            'game_id' => $game->getKey(),
            'round_id' => $round->getKey(),
            'round_number' => $round->round_number,
            'player_one_health' => $game->player_one_health,
            'player_two_health' => $game->player_two_health,
            'location_id' => $round->location->getKey(),
            'location_lat' => $round->location->lat,
            'location_lng' => $round->location->lng,
            'location_heading' => $round->location->heading,
            'location_image_id' => $round->location->image_id,
            'started_at' => optional($round->started_at)->toISOString(),
            'player_one_locked_in' => $round->player_one_locked_in,
            'player_two_locked_in' => $round->player_two_locked_in,
        ];

        return Inertia::render('game', [
            'player' => $player,
            'game' => $gameArray,
            'round_data' => $roundData,
        ]);
    }
}
