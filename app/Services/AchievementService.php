<?php

namespace App\Services;

use App\Events\AchievementEarned;
use App\Models\Achievement;
use App\Models\Game;
use App\Models\Player;
use App\Models\PlayerAchievement;
use Illuminate\Support\Facades\Cache;

class AchievementService
{
    public function evaluateAfterGame(Game $game): void
    {
        $game->load(['playerOne.stats', 'playerTwo']);

        $players = [
            ['player' => $game->playerOne, 'health' => $game->player_one_health],
            ['player' => $game->playerTwo, 'health' => $game->player_two_health],
        ];

        foreach ($players as $playerData) {
            $player = $playerData['player'];
            if (! $player) {
                continue;
            }

            $stats = $player->stats;
            $isWinner = $game->winner_id === $player->getKey();
            $health = $playerData['health'];

            // Reload stats if not loaded (e.g. for playerTwo)
            if (! $player->relationLoaded('stats')) {
                $player->load('stats');
                $stats = $player->stats;
            }

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

    public function award(Player $player, string $achievementKey): void
    {
        $achievement = $this->resolveAchievement($achievementKey);
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

    private function resolveAchievement(string $key): ?Achievement
    {
        $achievements = Cache::remember('achievements_by_key', 86400, function () {
            return Achievement::all()->keyBy('key');
        });

        return $achievements->get($key);
    }

    public static function clearCache(): void
    {
        Cache::forget('achievements_by_key');
    }
}
