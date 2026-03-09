<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSoloGames;
use App\Models\Round;
use App\Models\SoloGame;
use App\Models\SoloRound;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SoloGameGuess extends Controller
{
    use InteractsWithSoloGames;

    public function __invoke(Request $request, SoloGame $soloGame): JsonResponse
    {
        abort_if($soloGame->status === 'completed', 409, 'Game already completed');

        $validated = $request->validate([
            'round_id' => ['required', 'uuid'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $round = SoloRound::where('solo_game_id', $soloGame->getKey())
            ->where('id', $validated['round_id'])
            ->whereNull('finished_at')
            ->firstOrFail();

        $distanceKm = Round::calculateDistanceKm(
            (float) $round->location->lat,
            (float) $round->location->lng,
            (float) $validated['lat'],
            (float) $validated['lng'],
        );

        $score = Round::calculateScore(
            (float) $round->location->lat,
            (float) $round->location->lng,
            (float) $validated['lat'],
            (float) $validated['lng'],
        );

        $round->update([
            'guess_lat' => $validated['lat'],
            'guess_lng' => $validated['lng'],
            'score' => $score,
            'distance_km' => $distanceKm,
            'finished_at' => now(),
        ]);

        $totalScore = (int) $soloGame->rounds()->sum('score');
        $isLast = $round->round_number >= StartSoloGame::TOTAL_ROUNDS;

        if ($isLast) {
            $soloGame->complete();
        }

        $nextRound = $isLast
            ? null
            : $soloGame->rounds()
                ->where('round_number', $round->round_number + 1)
                ->first();

        return response()->json([
            'score' => $score,
            'distance_km' => $distanceKm,
            'location' => [
                'lat' => (float) $round->location->lat,
                'lng' => (float) $round->location->lng,
            ],
            'guess' => [
                'lat' => (float) $validated['lat'],
                'lng' => (float) $validated['lng'],
            ],
            'total_score' => $totalScore,
            'game_complete' => $isLast,
            'next_round' => $nextRound ? StartSoloGame::roundPayload($nextRound) : null,
        ]);
    }
}
