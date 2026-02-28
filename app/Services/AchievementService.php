<?php

namespace App\Services;

use App\Events\AchievementEarned;
use App\Models\Achievement;
use App\Models\Game;
use App\Models\Player;
use App\Models\PlayerAchievement;

class AchievementService
{
    public function evaluateAfterGame(Game $game): void
    {
        $players = [
            ['id' => $game->player_one_id, 'health' => $game->player_one_health],
            ['id' => $game->player_two_id, 'health' => $game->player_two_health],
        ];

        foreach ($players as $playerData) {
            $player = Player::find($playerData['id']);
            if (! $player) {
                continue;
            }

            $stats = $player->stats;
            $isWinner = $game->winner_id === $player->getKey();
            $health = $playerData['health'];

            // first_win
            if ($isWinner && ($stats?->games_won ?? 0) >= 1) {
                $this->award($player, 'first_win');
            }

            // win_streak_5
            if (($stats?->current_win_streak ?? 0) >= 5) {
                $this->award($player, 'win_streak_5');
            }

            // win_streak_10
            if (($stats?->current_win_streak ?? 0) >= 10) {
                $this->award($player, 'win_streak_10');
            }

            // perfect_round
            if (($stats?->perfect_rounds ?? 0) >= 1) {
                $this->award($player, 'perfect_round');
            }

            // games_played milestones
            $gamesPlayed = $stats?->games_played ?? 0;
            if ($gamesPlayed >= 10) {
                $this->award($player, 'games_played_10');
            }
            if ($gamesPlayed >= 50) {
                $this->award($player, 'games_played_50');
            }
            if ($gamesPlayed >= 100) {
                $this->award($player, 'games_played_100');
            }

            // rank achievements
            $elo = $player->elo_rating;
            if ($elo >= 1100) {
                $this->award($player, 'reach_gold');
            }
            if ($elo >= 1700) {
                $this->award($player, 'reach_diamond');
            }
            if ($elo >= 2000) {
                $this->award($player, 'reach_master');
            }

            // flawless_victory: win at full health
            if ($isWinner && $health >= config('game.max_health')) {
                $this->award($player, 'flawless_victory');
            }

            // comeback_king: win after dropping below 1000 health
            if ($isWinner && $health < 1000) {
                // The player won but had low health
                $this->award($player, 'comeback_king');
            }
        }
    }

    private function award(Player $player, string $achievementKey): void
    {
        $achievement = Achievement::query()->where('key', $achievementKey)->first();
        if (! $achievement) {
            return;
        }

        $exists = PlayerAchievement::query()
            ->where('player_id', $player->getKey())
            ->where('achievement_id', $achievement->getKey())
            ->exists();

        if ($exists) {
            return;
        }

        PlayerAchievement::create([
            'player_id' => $player->getKey(),
            'achievement_id' => $achievement->getKey(),
            'earned_at' => now(),
        ]);

        AchievementEarned::dispatch($player, $achievement);
    }
}
