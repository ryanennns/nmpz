<?php

namespace App\Listeners;

use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Location;
use App\Models\Round;
use App\Services\GameCompletionService;
use App\Services\HealthService;
use App\Services\PlayerStatsService;

class StartNextRound
{
    public function __construct(
        private readonly HealthService $healthService,
        private readonly PlayerStatsService $playerStatsService,
        private readonly GameCompletionService $gameCompletionService,
    ) {}

    public function handle(RoundFinished $event): void
    {
        $finished = $event->round;
        $game = Game::find($finished->game_id);

        $this->healthService->deductHealth($game, $finished);
        $this->playerStatsService->recordRound($game, $finished);

        if ($this->gameCompletionService->checkAndComplete($game, $finished)) {
            return;
        }

        if ($game->status === \App\Enums\GameStatus::Completed) {
            return;
        }

        $nextRoundNumber = $finished->round_number + 1;
        $location = $this->pickLocation($game, $nextRoundNumber);

        $next = Round::query()->create([
            'game_id' => $finished->game_id,
            'round_number' => $nextRoundNumber,
            'location_lat' => $location->lat,
            'location_lng' => $location->lng,
            'location_heading' => $location->heading,
            'started_at' => now(),
        ]);

        RoundStarted::dispatch($next, $game->player_one_health, $game->player_two_health, $game->player_one_wins, $game->player_two_wins);
        ForceEndRound::dispatch($next->getKey())->delay(now()->addSeconds(config('game.round_timeout_seconds')));
    }

    private function pickLocation(Game $game, int $roundNumber): Location
    {
        $count = Location::where('map_id', $game->map_id)->count();
        $offset = ($game->seed + $roundNumber - 1) % $count;

        return Location::where('map_id', $game->map_id)
            ->orderBy('id')
            ->offset($offset)
            ->firstOrFail();
    }
}
