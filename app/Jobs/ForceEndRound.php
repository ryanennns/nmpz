<?php

namespace App\Jobs;

use App\Events\RoundFinished;
use App\Models\Round;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ForceEndRound implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly string $roundId,
    ) {}

    public function handle(): void
    {
        $updated = Round::where('id', $this->roundId)
            ->whereNull('finished_at')
            ->update(['finished_at' => now()]);

        if (! $updated) {
            return;
        }

        $round = Round::find($this->roundId);
        $round->evaluateScores();
        RoundFinished::dispatch($round);
    }
}
