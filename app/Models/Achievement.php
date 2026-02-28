<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Achievement extends Model
{
    use HasUuids;

    protected $guarded = [];

    public function playerAchievements(): HasMany
    {
        return $this->hasMany(PlayerAchievement::class);
    }
}
