<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LocationReportVote extends Model
{
    use HasUuids;

    protected $guarded = [];

    public function locationReport(): BelongsTo
    {
        return $this->belongsTo(LocationReport::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
