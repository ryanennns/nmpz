<?php

namespace App\Models;

use App\Enums\GameStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Game extends Model
{
    use HasFactory,
        HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'status' => GameStatus::class,
            'player_one_health' => 'integer',
            'player_two_health' => 'integer',
        ];
    }

    public function playerOne(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player_one_id');
    }

    public function playerTwo(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player_two_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'winner_id');
    }

    public function rounds(): HasMany
    {
        return $this->hasMany(Round::class)->orderBy('round_number');
    }

    public function playerOneScore(): int
    {
        return (int) $this->rounds->sum('player_one_score');
    }

    public function playerTwoScore(): int
    {
        return (int) $this->rounds->sum('player_two_score');
    }
}
