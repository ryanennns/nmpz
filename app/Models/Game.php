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
            'no_guess_rounds' => 'integer',
            'player_one_rematch_requested' => 'boolean',
            'player_two_rematch_requested' => 'boolean',
            'player_one_wins' => 'integer',
            'player_two_wins' => 'integer',
            'max_rounds' => 'integer',
            'allow_spectators' => 'boolean',
            'spectator_count' => 'integer',
        ];
    }

    public function map(): BelongsTo
    {
        return $this->belongsTo(Map::class);
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

    public function spectators(): HasMany
    {
        return $this->hasMany(Spectator::class);
    }

    public function hasPlayer(Player $player): bool
    {
        return in_array($player->getKey(), [$this->player_one_id, $this->player_two_id]);
    }

    public function playerOneScore(): int
    {
        return (int) $this->rounds->sum('player_one_score');
    }

    public function playerTwoScore(): int
    {
        return (int) $this->rounds->sum('player_two_score');
    }

    public function isClassic(): bool
    {
        return $this->match_format === 'classic' || $this->match_format === null;
    }

    public function isRush(): bool
    {
        return $this->match_format === 'rush';
    }

    public function isBestOfN(): bool
    {
        return ! $this->isClassic() && ! $this->isRush();
    }

    public function winsNeeded(): ?int
    {
        return match ($this->match_format) {
            'bo3' => 2,
            'bo5' => 3,
            'bo7' => 4,
            default => null,
        };
    }

    public function roundTimeoutSeconds(): int
    {
        if ($this->isRush()) {
            return config('game.rush_round_timeout_seconds');
        }

        return config('game.round_timeout_seconds');
    }
}
