<?php

namespace App\Services;

use App\Enums\GameStatus;
use App\Events\GameFinished;
use App\Models\Game;
use App\Models\Round;

class GameCompletionService
{
    public function __construct(
        private readonly PlayerStatsService $playerStatsService,
        private readonly AchievementService $achievementService,
    ) {}

    public function checkAndComplete(Game $game, Round $round): bool
    {
        if ($game->isBestOfN()) {
            return $this->checkBestOfN($game, $round);
        }

        return $this->checkClassic($game, $round);
    }

    private function checkClassic(Game $game, Round $round): bool
    {
        if ($game->player_one_health <= 0 || $game->player_two_health <= 0) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => $game->player_one_health >= $game->player_two_health
                    ? $game->player_one_id
                    : $game->player_two_id,
            ]);

            $this->finalize($game);

            return true;
        }

        $noGuesses =
            $round->player_one_guess_lat === null &&
            $round->player_one_guess_lng === null &&
            $round->player_two_guess_lat === null &&
            $round->player_two_guess_lng === null;

        if ($noGuesses) {
            $game->increment('no_guess_rounds');
            $game->refresh();
        } elseif ($game->no_guess_rounds > 0) {
            $game->update(['no_guess_rounds' => 0]);
        }

        if ($game->no_guess_rounds >= config('game.no_guess_forfeit_rounds')) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => null,
            ]);

            $this->finalize($game);

            return true;
        }

        return false;
    }

    private function checkBestOfN(Game $game, Round $round): bool
    {
        $winsNeeded = $game->winsNeeded();

        // Check if either player reached wins needed
        if ($game->player_one_wins >= $winsNeeded) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => $game->player_one_id,
            ]);
            $this->finalize($game);

            return true;
        }

        if ($game->player_two_wins >= $winsNeeded) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => $game->player_two_id,
            ]);
            $this->finalize($game);

            return true;
        }

        // Check if max_rounds reached
        $roundsPlayed = $game->rounds()->count();
        if ($game->max_rounds && $roundsPlayed >= $game->max_rounds) {
            $winnerId = null;
            if ($game->player_one_wins > $game->player_two_wins) {
                $winnerId = $game->player_one_id;
            } elseif ($game->player_two_wins > $game->player_one_wins) {
                $winnerId = $game->player_two_id;
            }

            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => $winnerId,
            ]);
            $this->finalize($game);

            return true;
        }

        // No-guess forfeit still applies to bo-N
        $noGuesses =
            $round->player_one_guess_lat === null &&
            $round->player_one_guess_lng === null &&
            $round->player_two_guess_lat === null &&
            $round->player_two_guess_lng === null;

        if ($noGuesses) {
            $game->increment('no_guess_rounds');
            $game->refresh();
        } elseif ($game->no_guess_rounds > 0) {
            $game->update(['no_guess_rounds' => 0]);
        }

        if ($game->no_guess_rounds >= config('game.no_guess_forfeit_rounds')) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => null,
            ]);
            $this->finalize($game);

            return true;
        }

        return false;
    }

    private function finalize(Game $game): void
    {
        $this->playerStatsService->recordGameEnd($game);
        EloCalculator::calculate($game);
        $this->achievementService->evaluateAfterGame($game);
        GameFinished::dispatch($game);
    }
}
