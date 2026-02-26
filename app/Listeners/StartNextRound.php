<?php

namespace App\Listeners;

use App\Enums\GameStatus;
use App\Events\GameFinished;
use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Location;
use App\Models\Round;
use Illuminate\Contracts\Queue\ShouldQueue;

class StartNextRound implements ShouldQueue
{
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

        $noGuesses =
            $finished->player_one_guess_lat === null &&
            $finished->player_one_guess_lng === null &&
            $finished->player_two_guess_lat === null &&
            $finished->player_two_guess_lng === null;

        if ($noGuesses) {
            $game->increment('no_guess_rounds');
            $game->refresh();
        } elseif ($game->no_guess_rounds > 0) {
            $game->update(['no_guess_rounds' => 0]);
        }

        if ($game->no_guess_rounds >= 3) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => null,
            ]);

            GameFinished::dispatch($game);

            return;
        }

        if ($game->status === GameStatus::Completed) {
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

        RoundStarted::dispatch($next, $game->player_one_health, $game->player_two_health);
        ForceEndRound::dispatch($next->getKey())->delay(now()->addSeconds(60));
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
