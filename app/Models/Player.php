<?php

namespace App\Models;

use App\Enums\GameStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Player extends Model
{
    use HasFactory,
        HasUuids;

    protected $guarded = [];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gamesAsPlayerOne(): HasMany
    {
        return $this->hasMany(Game::class, 'player_one_id');
    }

    public function gamesAsPlayerTwo(): HasMany
    {
        return $this->hasMany(Game::class, 'player_two_id');
    }

    public function wonGames(): HasMany
    {
        return $this->hasMany(Game::class, 'winner_id');
    }

    public function games(): \Illuminate\Database\Eloquent\Builder
    {
        return Game::where('player_one_id', $this->getKey())
            ->orWhere('player_two_id', $this->getKey());
    }

    public function stats(): HasOne
    {
        return $this->hasOne(PlayerStats::class);
    }

    public function eloHistory(): HasMany
    {
        return $this->hasMany(EloHistory::class)->orderByDesc('created_at');
    }

    public function playerAchievements(): HasMany
    {
        return $this->hasMany(PlayerAchievement::class);
    }

    public function getRankAttribute(): string
    {
        $elo = $this->elo_rating;

        return match (true) {
            $elo >= 2000 => 'Master',
            $elo >= 1700 => 'Diamond',
            $elo >= 1400 => 'Platinum',
            $elo >= 1100 => 'Gold',
            $elo >= 800 => 'Silver',
            default => 'Bronze',
        };
    }

    public function hasActiveGame(): bool
    {
        return Game::query()
            ->where('status', GameStatus::InProgress)
            ->where(function ($query) {
                $query->where('player_one_id', $this->getKey())
                    ->orWhere('player_two_id', $this->getKey());
            })
            ->exists();
    }
}
