<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyChallengeEntry extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'total_score' => 'integer',
            'round_scores' => 'array',
            'rounds_completed' => 'integer',
            'completed_at' => 'datetime',
            'started_at' => 'datetime',
            'round_started_at' => 'datetime',
        ];
    }

    public function dailyChallenge(): BelongsTo
    {
        return $this->belongsTo(DailyChallenge::class);
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }
}
