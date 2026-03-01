<?php

namespace App\Jobs;

use App\Actions\MatchmakeQueue;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\CacheKeys;
use Illuminate\Support\Facades\Cache;

class MatchmakeQueueJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function handle(MatchmakeQueue $matchmaker): void
    {
        $matchmaker->handle();

        $queue = Cache::get(CacheKeys::MATCHMAKING_QUEUE, []);
        if (count($queue) >= 2) {
            self::dispatch()->delay(now()->addSecond());
        }
    }
}
