<?php

namespace App\Models;

use App\Services\ScoringService;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Round extends Model
{
    use HasFactory,
        HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'location_lat' => 'float',
            'location_lng' => 'float',
            'player_one_guess_lat' => 'float',
            'player_one_guess_lng' => 'float',
            'player_two_guess_lat' => 'float',
            'player_two_guess_lng' => 'float',
            'player_one_score' => 'integer',
            'player_two_score' => 'integer',
            'player_one_locked_in' => 'boolean',
            'player_two_locked_in' => 'boolean',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function evaluateScores(): void
    {
        if ($this->player_one_guess_lat !== null && $this->player_one_guess_lng !== null) {
            $this->player_one_score = ScoringService::calculateScore(
                $this->location_lat,
                $this->location_lng,
                $this->player_one_guess_lat,
                $this->player_one_guess_lng,
            );
        }

        if ($this->player_two_guess_lat !== null && $this->player_two_guess_lng !== null) {
            $this->player_two_score = ScoringService::calculateScore(
                $this->location_lat,
                $this->location_lng,
                $this->player_two_guess_lat,
                $this->player_two_guess_lng,
            );
        }

        $this->save();
    }
}
