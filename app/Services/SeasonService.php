<?php

namespace App\Services;

use App\Models\Player;
use App\Models\PlayerStats;
use App\Models\Season;
use App\Models\SeasonResult;

class SeasonService
{
    public function endSeason(Season $season): void
    {
        Player::with('stats')->chunk(200, function ($players) use ($season) {
            foreach ($players as $player) {
                $stats = $player->stats;

                SeasonResult::updateOrCreate(
                    [
                        'season_id' => $season->getKey(),
                        'player_id' => $player->getKey(),
                    ],
                    [
                        'final_elo' => $player->elo_rating,
                        'peak_elo' => $player->elo_rating,
                        'peak_rank' => $player->rank,
                        'games_played' => $stats?->games_played ?? 0,
                        'games_won' => $stats?->games_won ?? 0,
                    ],
                );
            }
        });

        $season->update(['is_active' => false]);
    }

    public function startNewSeason(?Season $previousSeason = null): Season
    {
        $seasonNumber = $previousSeason
            ? $previousSeason->season_number + 1
            : 1;

        $startDate = today();
        $endDate = today()->addMonth()->subDay();

        $season = Season::create([
            'season_number' => $seasonNumber,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'is_active' => true,
        ]);

        // Soft reset elo — move everyone toward 1000
        $eloFloor = config('game.elo_floor');
        Player::query()->chunk(200, function ($players) use ($eloFloor) {
            foreach ($players as $player) {
                $currentElo = $player->elo_rating;
                $newElo = (int) round(1000 + ($currentElo - 1000) * 0.5);
                $player->update(['elo_rating' => max($newElo, $eloFloor)]);
            }
        });

        return $season;
    }

    public function rotateSeason(): Season
    {
        $current = Season::current();

        if ($current) {
            $this->endSeason($current);
        }

        return $this->startNewSeason($current);
    }
}
