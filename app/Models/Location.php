<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Location extends Model
{
    use HasFactory,
        HasUuids,
        SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'heading' => 'integer',
        ];
    }

    public function maps(): BelongsToMany
    {
        return $this->belongsToMany(Map::class, 'map_locations');
    }

    public function rounds(): HasMany
    {
        return $this->hasMany(Round::class);
    }

    public function locationReports(): HasMany
    {
        return $this->hasMany(LocationReport::class);
    }
}
