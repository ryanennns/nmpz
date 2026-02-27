<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Round extends Model
{
    use HasFactory,
        HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'location_lat' => 'float',
            'location_lng' => 'float',
            'player_one_guess_lat' => 'float',
            'player_one_guess_lng' => 'float',
            'player_two_guess_lat' => 'float',
            'player_two_guess_lng' => 'float',
            'player_one_score' => 'integer',
            'player_two_score' => 'integer',
            'player_one_locked_in' => 'boolean',
            'player_two_locked_in' => 'boolean',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function evaluateScores(): void
    {
        if ($this->player_one_guess_lat !== null && $this->player_one_guess_lng !== null) {
            $this->player_one_score = self::calculateScore(
                $this->location_lat,
                $this->location_lng,
                $this->player_one_guess_lat,
                $this->player_one_guess_lng,
            );
        }

        if ($this->player_two_guess_lat !== null && $this->player_two_guess_lng !== null) {
            $this->player_two_score = self::calculateScore(
                $this->location_lat,
                $this->location_lng,
                $this->player_two_guess_lat,
                $this->player_two_guess_lng,
            );
        }

        $this->save();
    }

    public static function calculateScore(float $lat1, float $lng1, float $lat2, float $lng2): int
    {
        $distanceKm = self::haversineDistanceKm($lat1, $lng1, $lat2, $lng2);

        if ($distanceKm < 0.025) {
            return 5000;
        }

        return (int) round(5000 * exp(-$distanceKm / 2000.0));
    }

    public static function haversineDistanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
