<?php

namespace App\Listeners;

use App\Enums\GameStatus;
use App\Events\GameFinished;
use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Location;
use App\Models\Player;
use App\Models\Round;

class StartNextRound
{
    public function handle(RoundFinished $event): void
    {
        $finished = $event->round;
        $game = Game::query()->find($finished->game_id);

        $this->deductHealth($game, $finished);

        if ($game->player_one_health <= 0 || $game->player_two_health <= 0) {
            $winnerId = $game->player_one_health >= $game->player_two_health
                ? $game->player_one_id
                : $game->player_two_id;

            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => $winnerId,
            ]);

            $updatedElo = $this->resolveEloUpdate($game->playerOne, $game->playerTwo, $winnerId);

            GameFinished::dispatch($game, $updatedElo);

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

            $updatedElo = $this->resolveEloUpdate($game->playerOne, $game->playerTwo, null);

            GameFinished::dispatch($game, $updatedElo);

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
            'location_id' => $location->getKey(),
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

    private function updateElo(Player $playerOne, Player $playerTwo, ?string $winnerId): array
    {
        $k = 32;

        $expectedOne = 1 / (1 + 10 ** (($playerTwo->elo_rating - $playerOne->elo_rating) / 400));
        $expectedTwo = 1 - $expectedOne;

        if ($winnerId === null) {
            $scoreOne = 0.5;
            $scoreTwo = 0.5;
        } elseif ($winnerId === $playerOne->getKey()) {
            $scoreOne = 1;
            $scoreTwo = 0;
        } else {
            $scoreOne = 0;
            $scoreTwo = 1;
        }

        $p1EloChange = $k * ($scoreOne - $expectedOne);
        $p2EloChange = $k * ($scoreTwo - $expectedTwo);
        $playerOne->update([
            'elo_rating' => (int) round($playerOne->elo_rating + $p1EloChange),
        ]);

        $playerTwo->update([
            'elo_rating' => (int) round($playerTwo->elo_rating + $p2EloChange),
        ]);

        return [
            $playerOne->getKey() => $p1EloChange,
            $playerTwo->getKey() => $p2EloChange,
        ];
    }

    private function resolveEloUpdate(Player $playerOne, Player $playerTwo, ?string $winnerId): array
    {
        if (! $playerOne->user()->exists() || ! $playerTwo->user()->exists()) {
            return [
                $playerOne->getKey() => 0,
                $playerTwo->getKey() => 0,
            ];
        }

        return $this->updateElo($playerOne, $playerTwo, $winnerId);
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
