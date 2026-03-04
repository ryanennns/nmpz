<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\Player;
use App\Models\SoloGame;
use App\Models\SoloRound;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StartSoloGame extends Controller
{
    const TOTAL_ROUNDS = 5;

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'player_id' => ['required', 'uuid', 'exists:players,id'],
        ]);

        $player = Player::query()->findOrFail($validated['player_id']);

        $locations = Location::query()->whereHas('map', fn ($q) => $q->where('name', 'likeacw-mapillary'))
            ->inRandomOrder()
            ->limit(self::TOTAL_ROUNDS)
            ->get();

        abort_if($locations->count() < self::TOTAL_ROUNDS, 500, 'Not enough locations');

        $game = SoloGame::create(['player_id' => $player->getKey()]);

        foreach ($locations as $index => $location) {
            SoloRound::create([
                'solo_game_id' => $game->getKey(),
                'location_id' => $location->getKey(),
                'round_number' => $index + 1,
            ]);
        }

        return response()->json([
            'game_id' => $game->getKey(),
        ]);
    }

    public static function roundPayload(SoloRound $round): array
    {
        return [
            'id' => $round->getKey(),
            'round_number' => $round->round_number,
            'location' => [
                'id' => $round->location->getKey(),
                'lat' => (float) $round->location->lat,
                'lng' => (float) $round->location->lng,
                'heading' => (int) $round->location->heading,
                'image_id' => $round->location->image_id,
            ],
        ];
    }
}
