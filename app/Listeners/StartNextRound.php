<?php

namespace App\Listeners;

use App\Enums\GameStatus;
use App\Events\GameFinished;
use App\Events\RoundFinished;
use App\Events\RoundStarted;
use App\Jobs\ForceEndRound;
use App\Models\EloHistory;
use App\Models\Game;
use App\Models\Location;
use App\Models\Player;
use App\Models\PlayerStats;
use App\Models\Round;

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

        if ($game->no_guess_rounds >= 3) {
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

            if ($myScore === 5000 && $hasGuess) {
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

        $this->updateEloRatings($game);
    }

    private function updateEloRatings(Game $game): void
    {
        $p1 = Player::find($game->player_one_id);
        $p2 = Player::find($game->player_two_id);

        if (! $p1 || ! $p2) {
            return;
        }

        $p1Rating = $p1->elo_rating;
        $p2Rating = $p2->elo_rating;

        // Expected scores (standard ELO formula)
        $expected1 = 1 / (1 + pow(10, ($p2Rating - $p1Rating) / 400));
        $expected2 = 1 - $expected1;

        // Actual scores: 1 for win, 0.5 for draw, 0 for loss
        if ($game->winner_id === null) {
            $actual1 = 0.5;
            $actual2 = 0.5;
        } elseif ($game->winner_id === $p1->getKey()) {
            $actual1 = 1;
            $actual2 = 0;
        } else {
            $actual1 = 0;
            $actual2 = 1;
        }

        // K-factor: higher for newer players, lower for experienced
        $k1 = $this->kFactor($p1);
        $k2 = $this->kFactor($p2);

        // Health margin bonus: scale K up to 50% for dominant wins
        $marginMultiplier = 1.0;
        if ($game->winner_id !== null) {
            $winnerHealth = $game->winner_id === $p1->getKey()
                ? $game->player_one_health
                : $game->player_two_health;
            // Max health is 5000; more health remaining = more dominant
            $marginMultiplier = 1.0 + 0.5 * ($winnerHealth / 5000);
        }

        $change1 = (int) round($k1 * $marginMultiplier * ($actual1 - $expected1));
        $change2 = (int) round($k2 * $marginMultiplier * ($actual2 - $expected2));

        $new1 = max(100, $p1Rating + $change1);
        $new2 = max(100, $p2Rating + $change2);

        $p1->update(['elo_rating' => $new1]);
        $p2->update(['elo_rating' => $new2]);

        EloHistory::create([
            'player_id' => $p1->getKey(),
            'game_id' => $game->getKey(),
            'rating_before' => $p1Rating,
            'rating_after' => $new1,
            'rating_change' => $new1 - $p1Rating,
            'opponent_rating' => $p2Rating,
        ]);

        EloHistory::create([
            'player_id' => $p2->getKey(),
            'game_id' => $game->getKey(),
            'rating_before' => $p2Rating,
            'rating_after' => $new2,
            'rating_change' => $new2 - $p2Rating,
            'opponent_rating' => $p1Rating,
        ]);

        // Store rating changes on the game for broadcasting
        $game->update([
            'player_one_rating_change' => $new1 - $p1Rating,
            'player_two_rating_change' => $new2 - $p2Rating,
        ]);
    }

    private function kFactor(Player $player): int
    {
        $stats = PlayerStats::where('player_id', $player->getKey())->first();
        $gamesPlayed = $stats?->games_played ?? 0;

        if ($gamesPlayed < 10) {
            return 40;
        }

        if ($player->elo_rating < 1400) {
            return 32;
        }

        return 24;
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
