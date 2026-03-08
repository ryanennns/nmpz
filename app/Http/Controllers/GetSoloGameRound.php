<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSoloGames;
use App\Models\SoloGame;
use App\Models\SoloRound;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GetSoloGameRound extends Controller
{
    use InteractsWithSoloGames;

    public function __invoke(Request $request, SoloGame $soloGame): JsonResponse
    {
        $completedRounds = $soloGame->rounds()
            ->whereNotNull('finished_at')
            ->get()
            ->map(fn (SoloRound $round) => [
                'round_number' => $round->round_number,
                'score' => (int) $round->score,
                'distance_km' => (float) $round->distance_km,
                'location' => [
                    'lat' => (float) $round->location->lat,
                    'lng' => (float) $round->location->lng,
                    'heading' => (int) $round->location->heading,
                    'image_id' => $round->location->image_id,
                ],
                'guess' => [
                    'lat' => (float) $round->guess_lat,
                    'lng' => (float) $round->guess_lng,
                ],
            ])
            ->values();

        $currentRound = $soloGame->rounds()
            ->whereNull('finished_at')
            ->first();

        $highestSingleplayerScore = 0;
        if ($soloGame->player_id !== null) {
            $highestSingleplayerScore = (int) (
                SoloGame::query()
                    ->where('player_id', $soloGame->player_id)
                    ->where('status', 'completed')
                    ->leftJoin('solo_rounds', 'solo_rounds.solo_game_id', '=', 'solo_games.id')
                    ->groupBy('solo_games.id')
                    ->selectRaw('COALESCE(SUM(solo_rounds.score), 0) as total_score')
                    ->get()
                    ->max('total_score') ?? 0
            );
        }

        return response()->json([
            'game_id' => $soloGame->getKey(),
            'total_rounds' => StartSoloGame::TOTAL_ROUNDS,
            'game_complete' => $soloGame->status === 'completed',
            'current_round' => $currentRound ? StartSoloGame::roundPayload($currentRound) : null,
            'completed_rounds' => $completedRounds,
            'highest_singleplayer_score' => $highestSingleplayerScore,
        ]);
    }
}
