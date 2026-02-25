<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
}
