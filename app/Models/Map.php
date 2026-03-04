<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Map extends Model
{
    use HasFactory;
    use HasUuids;

    public const ALL_LOCATIONS_MAP = 'all';

    protected $guarded = [];

    public function locations(): BelongsToMany
    {
        return $this->belongsToMany(Location::class, 'map_locations');
    }
}
