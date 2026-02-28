<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Friendship extends Model
{
    use HasUuids;

    protected $guarded = [];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'sender_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'receiver_id');
    }

    public static function areFriends(string $playerOneId, string $playerTwoId): bool
    {
        return static::query()
            ->where('status', 'accepted')
            ->where(function ($q) use ($playerOneId, $playerTwoId) {
                $q->where(fn ($q2) => $q2->where('sender_id', $playerOneId)->where('receiver_id', $playerTwoId))
                    ->orWhere(fn ($q2) => $q2->where('sender_id', $playerTwoId)->where('receiver_id', $playerOneId));
            })
            ->exists();
    }
}
