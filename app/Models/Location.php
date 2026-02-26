<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Location extends Model
{
    use HasFactory,
        HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'heading' => 'integer',
        ];
    }

    public function map(): BelongsTo
    {
        return $this->belongsTo(Map::class);
    }
}
