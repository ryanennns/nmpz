<?php

use App\Actions\MatchmakeQueue;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('matchmake:run', function (MatchmakeQueue $matchmaker) {
    $matches = $matchmaker->handle();
    $this->info("Matched {$matches} game(s).");
})->purpose('Run matchmaking for queued players');
