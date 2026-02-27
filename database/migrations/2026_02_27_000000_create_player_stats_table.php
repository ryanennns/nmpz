<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_stats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('player_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('games_played')->default(0);
            $table->unsignedInteger('games_won')->default(0);
            $table->unsignedInteger('games_lost')->default(0);
            $table->unsignedInteger('total_rounds')->default(0);
            $table->unsignedBigInteger('total_score')->default(0);
            $table->unsignedSmallInteger('best_round_score')->default(0);
            $table->unsignedBigInteger('total_damage_dealt')->default(0);
            $table->unsignedBigInteger('total_damage_taken')->default(0);
            $table->unsignedInteger('current_win_streak')->default(0);
            $table->unsignedInteger('best_win_streak')->default(0);
            $table->unsignedInteger('perfect_rounds')->default(0);
            $table->float('closest_guess_km')->nullable();
            $table->float('total_distance_km')->default(0);
            $table->unsignedInteger('total_guesses_made')->default(0);
            $table->unsignedInteger('total_guesses_missed')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_stats');
    }
};
