<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SoloRound extends Model
{
    use HasUuids;
    use HasFactory;

    protected $guarded = [];

    protected $with = ['location'];

    protected function casts(): array
    {
        return [
            'guess_lat' => 'float',
            'guess_lng' => 'float',
            'score' => 'integer',
            'distance_km' => 'float',
            'finished_at' => 'datetime',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(SoloGame::class, 'solo_game_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
