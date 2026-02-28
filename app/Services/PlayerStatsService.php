<?php

namespace App\Services;

use App\Models\Game;
use App\Models\PlayerStats;
use App\Models\Round;

class PlayerStatsService
{
    public function recordRound(Game $game, Round $round): void
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
                $distanceKm = ScoringService::haversineDistanceKm(
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

    public function recordGameEnd(Game $game): void
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
    }
}
