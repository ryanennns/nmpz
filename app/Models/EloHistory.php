<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EloHistory extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'elo_history';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'rating_before' => 'integer',
            'rating_after' => 'integer',
            'rating_change' => 'integer',
            'opponent_rating' => 'integer',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
