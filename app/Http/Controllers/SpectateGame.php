<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Player;
use App\Models\Spectator;
use App\Presenters\GamePresenter;
use App\Services\ScoringService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SpectateGame extends Controller
{
    public function __invoke(Request $request, Game $game): Response
    {
        abort_if(! $game->allow_spectators, 403, 'Spectating is not allowed for this game.');
        abort_if($game->status !== GameStatus::InProgress, 404, 'Game is not in progress.');

        $game->load(['playerOne.user', 'playerTwo.user', 'rounds']);

        // Track spectator
        $playerId = $request->session()->get('player_id');
        Spectator::query()->create([
            'game_id' => $game->getKey(),
            'player_id' => $playerId,
            'session_id' => $request->session()->getId(),
        ]);
        $game->increment('spectator_count');

        // Build completed rounds data
        $completedRounds = $game->rounds
            ->whereNotNull('finished_at')
            ->map(fn ($round) => [
                'round_number' => $round->round_number,
                'location_lat' => $round->location_lat,
                'location_lng' => $round->location_lng,
                'player_one_guess_lat' => $round->player_one_guess_lat,
                'player_one_guess_lng' => $round->player_one_guess_lng,
                'player_two_guess_lat' => $round->player_two_guess_lat,
                'player_two_guess_lng' => $round->player_two_guess_lng,
                'player_one_score' => $round->player_one_score,
                'player_two_score' => $round->player_two_score,
                'player_one_distance_km' => $this->distanceKm($round, 'player_one'),
                'player_two_distance_km' => $this->distanceKm($round, 'player_two'),
            ])
            ->values();

        $currentRound = $game->rounds->whereNull('finished_at')->first();

        return Inertia::render('spectate', [
            'game' => GamePresenter::toArray($game),
            'completed_rounds' => $completedRounds,
            'current_round_number' => $currentRound?->round_number,
        ]);
    }

    private function distanceKm($round, string $prefix): ?float
    {
        $lat = $round->{"{$prefix}_guess_lat"};
        $lng = $round->{"{$prefix}_guess_lng"};

        if ($lat === null || $lng === null) {
            return null;
        }

        return round(ScoringService::haversineDistanceKm(
            $round->location_lat,
            $round->location_lng,
            $lat,
            $lng,
        ), 2);
    }
}
