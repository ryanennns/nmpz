<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('player_stats', function (Blueprint $table) {
            $table->unsignedInteger('solo_games_played')->default(0);
            $table->unsignedInteger('solo_rounds_played')->default(0);
            $table->unsignedBigInteger('solo_total_score')->default(0);
            $table->unsignedSmallInteger('solo_best_round_score')->default(0);
            $table->unsignedInteger('solo_perfect_rounds')->default(0);
            $table->unsignedInteger('solo_best_streak')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('player_stats', function (Blueprint $table) {
            $table->dropColumn([
                'solo_games_played',
                'solo_rounds_played',
                'solo_total_score',
                'solo_best_round_score',
                'solo_perfect_rounds',
                'solo_best_streak',
            ]);
        });
    }
};
