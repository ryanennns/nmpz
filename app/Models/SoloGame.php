<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SoloGame extends Model
{
    use HasUuids;

    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';

    protected $guarded = [];

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    public function rounds(): HasMany
    {
        return $this->hasMany(SoloRound::class)->orderBy('round_number');
    }

    public function complete(): void
    {
         $this->update(['status' => self::STATUS_COMPLETED]);
    }
}
