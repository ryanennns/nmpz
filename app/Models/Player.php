<?php

namespace App\Models;

use App\Enums\GameStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    use HasFactory;
    use HasUuids;

    protected $guarded = [];

    public function isGuest(): bool
    {
        return $this->user()->doesntExist();
    }

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

    public function games(): Builder
    {
        return Game::where('player_one_id', $this->getKey())
            ->orWhere('player_two_id', $this->getKey());
    }

    public function soloGames(): HasMany
    {
        return $this->hasMany(SoloGame::class);
    }

    public function hasActiveGame(): bool
    {
        return $this->games()
            ->where('status', GameStatus::InProgress)
            ->where(function ($query) {
                $query->where('player_one_id', $this->getKey())
                    ->orWhere('player_two_id', $this->getKey());
            })
            ->exists();
    }

    public function highScore(): int
    {
        return $this->soloGames()
            ->orderByDesc('score')
            ->select('score')
            ->first()?->score ?? 0;
    }
}
