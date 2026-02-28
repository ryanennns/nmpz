<?php

namespace App\Presenters;

use App\Models\Game;
use App\Models\Player;

class GamePresenter
{
    public static function toArray(Game $game): array
    {
        return [
            'id' => $game->getKey(),
            'player_one' => self::playerToArray($game->playerOne, $game->player_one_id),
            'player_two' => self::playerToArray($game->playerTwo, $game->player_two_id),
            'player_one_health' => $game->player_one_health,
            'player_two_health' => $game->player_two_health,
        ];
    }

    public static function playerToArray(?Player $player, string $playerId): array
    {
        return [
            'id' => $playerId,
            'user' => ['name' => $player?->user?->name ?? 'Unknown'],
            'elo_rating' => $player?->elo_rating ?? 1000,
            'rank' => $player?->rank ?? 'Bronze',
        ];
    }
}
