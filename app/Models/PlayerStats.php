<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerStats extends Model
{
    use HasFactory, HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'games_played' => 'integer',
            'games_won' => 'integer',
            'games_lost' => 'integer',
            'total_rounds' => 'integer',
            'total_score' => 'integer',
            'best_round_score' => 'integer',
            'total_damage_dealt' => 'integer',
            'total_damage_taken' => 'integer',
            'current_win_streak' => 'integer',
            'best_win_streak' => 'integer',
            'perfect_rounds' => 'integer',
            'closest_guess_km' => 'float',
            'total_distance_km' => 'float',
            'total_guesses_made' => 'integer',
            'total_guesses_missed' => 'integer',
            'daily_current_streak' => 'integer',
            'daily_best_streak' => 'integer',
            'solo_games_played' => 'integer',
            'solo_rounds_played' => 'integer',
            'solo_total_score' => 'integer',
            'solo_best_round_score' => 'integer',
            'solo_perfect_rounds' => 'integer',
            'solo_best_streak' => 'integer',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function getWinRateAttribute(): float
    {
        return $this->games_played > 0
            ? round($this->games_won / $this->games_played * 100, 1)
            : 0;
    }

    public function getAverageScoreAttribute(): float
    {
        return $this->total_rounds > 0
            ? round($this->total_score / $this->total_rounds, 1)
            : 0;
    }

    public function getAverageDistanceKmAttribute(): float
    {
        return $this->total_guesses_made > 0
            ? round($this->total_distance_km / $this->total_guesses_made, 2)
            : 0;
    }
}
