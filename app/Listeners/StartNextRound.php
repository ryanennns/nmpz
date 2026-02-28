<?php

namespace App\Listeners;

use App\Enums\GameStatus;
use App\Events\GameFinished;
use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Models\Game;
use App\Models\Location;
use App\Models\PlayerStats;
use App\Models\Round;
use App\Services\EloCalculator;

class StartNextRound
{
    public function handle(RoundFinished $event): void
    {
        $finished = $event->round;
        $game = Game::find($finished->game_id);

        $this->deductHealth($game, $finished);
        $this->updateRoundStats($game, $finished);

        if ($game->player_one_health <= 0 || $game->player_two_health <= 0) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => $game->player_one_health >= $game->player_two_health
                    ? $game->player_one_id
                    : $game->player_two_id,
            ]);

            $this->updateGameStats($game);
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

        if ($game->no_guess_rounds >= config('game.no_guess_forfeit_rounds')) {
            $game->update([
                'status' => GameStatus::Completed,
                'winner_id' => null,
            ]);

            $this->updateGameStats($game);
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
        ForceEndRound::dispatch($next->getKey())->delay(now()->addSeconds(config('game.round_timeout_seconds')));
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

    private function updateRoundStats(Game $game, Round $round): void
    {
        $p1Score = $round->player_one_score ?? 0;
        $p2Score = $round->player_two_score ?? 0;
        $damage = abs($p1Score - $p2Score);

        foreach (['player_one' => $game->player_one_id, 'player_two' => $game->player_two_id] as $prefix => $playerId) {
            $stats = PlayerStats::firstOrCreate(['player_id' => $playerId]);

            $myScore = $prefix === 'player_one' ? $p1Score : $p2Score;
            $opponentScore = $prefix === 'player_one' ? $p2Score : $p1Score;
            $guessLat = $round->{"{$prefix}_guess_lat"};
            $guessLng = $round->{"{$prefix}_guess_lng"};
            $hasGuess = $guessLat !== null && $guessLng !== null;

            $stats->total_rounds++;
            $stats->total_score += $myScore;

            if ($myScore > $stats->best_round_score) {
                $stats->best_round_score = $myScore;
            }

            if ($myScore === config('game.max_health') && $hasGuess) {
                $stats->perfect_rounds++;
            }

            if ($hasGuess) {
                $stats->total_guesses_made++;
                $distanceKm = Round::haversineDistanceKm(
                    $round->location_lat,
                    $round->location_lng,
                    $guessLat,
                    $guessLng,
                );
                $stats->total_distance_km += $distanceKm;

                if ($stats->closest_guess_km === null || $distanceKm < $stats->closest_guess_km) {
                    $stats->closest_guess_km = $distanceKm;
                }
            } else {
                $stats->total_guesses_missed++;
            }

            if ($myScore < $opponentScore) {
                $stats->total_damage_taken += $damage;
            } elseif ($myScore > $opponentScore) {
                $stats->total_damage_dealt += $damage;
            }

            $stats->save();
        }
    }

    private function updateGameStats(Game $game): void
    {
        foreach ([$game->player_one_id, $game->player_two_id] as $playerId) {
            $stats = PlayerStats::firstOrCreate(['player_id' => $playerId]);

            $stats->games_played++;

            if ($game->winner_id === $playerId) {
                $stats->games_won++;
                $stats->current_win_streak++;
                if ($stats->current_win_streak > $stats->best_win_streak) {
                    $stats->best_win_streak = $stats->current_win_streak;
                }
            } elseif ($game->winner_id !== null) {
                $stats->games_lost++;
                $stats->current_win_streak = 0;
            }

            $stats->save();
        }

        EloCalculator::calculate($game);
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
