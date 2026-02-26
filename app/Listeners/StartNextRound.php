<?php

namespace App\Listeners;

use App\Enums\GameStatus;
use App\Events\GameFinished;
use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Models\Game;
use App\Models\Location;
use App\Models\Round;
use Illuminate\Contracts\Queue\ShouldQueue;

class StartNextRound implements ShouldQueue
{
    public int $delay = 3;

    public function handle(RoundFinished $event): void
    {
        $finished = $event->round;
        $game = Game::find($finished->game_id);

        $this->deductHealth($game, $finished);

        if ($game->player_one_health <= 0 || $game->player_two_health <= 0) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => $game->player_one_health >= $game->player_two_health
                    ? $game->player_one_id
                    : $game->player_two_id,
            ]);

            GameFinished::dispatch($game);

            return;
        }

        $location = $this->pickLocation($game->map_id);

        $next = Round::query()->create([
            'game_id' => $finished->game_id,
            'round_number' => $finished->round_number + 1,
            'location_lat' => $location->lat,
            'location_lng' => $location->lng,
            'location_heading' => $location->heading,
        ]);

        RoundStarted::dispatch($next, $game->player_one_health, $game->player_two_health);
    }

    private function deductHealth(Game $game, Round $round): void
    {
        $p1 = $round->player_one_score ?? 0;
        $p2 = $round->player_two_score ?? 0;
        $damage = abs($p1 - $p2);

        if ($p1 < $p2) {
            $game->player_one_health -= $damage;
        } elseif ($p2 < $p1) {
            $game->player_two_health -= $damage;
        }

        $game->save();
    }

    private function pickLocation(string $mapId): Location
    {
        return Location::query()
            ->where('map_id', $mapId)
            ->inRandomOrder()
            ->firstOrFail();
    }
}
