<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rivalry extends Model
{
    use HasFactory, HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'consecutive_rematches' => 'integer',
            'total_games' => 'integer',
            'player_one_wins' => 'integer',
            'player_two_wins' => 'integer',
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

    public static function findOrCreateBetween(string $playerOneId, string $playerTwoId): self
    {
        // Always store in consistent order (lower id first)
        $ids = [$playerOneId, $playerTwoId];
        sort($ids);

        return static::firstOrCreate(
            ['player_one_id' => $ids[0], 'player_two_id' => $ids[1]],
            ['consecutive_rematches' => 0, 'total_games' => 0, 'player_one_wins' => 0, 'player_two_wins' => 0],
        );
    }
}
