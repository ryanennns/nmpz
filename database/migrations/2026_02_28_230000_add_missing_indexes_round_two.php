<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rounds', function (Blueprint $table) {
            $table->index(['game_id', 'finished_at']);
        });

        Schema::table('solo_games', function (Blueprint $table) {
            $table->index(['player_id', 'status']);
        });

        Schema::table('solo_personal_bests', function (Blueprint $table) {
            $table->index('player_id');
        });

        Schema::table('daily_challenge_entries', function (Blueprint $table) {
            $table->index(['daily_challenge_id', 'completed_at']);
        });

        Schema::table('friendships', function (Blueprint $table) {
            $table->index('sender_id');
        });

        Schema::table('season_results', function (Blueprint $table) {
            $table->index('season_id');
        });
    }

    public function down(): void
    {
        Schema::table('rounds', function (Blueprint $table) {
            $table->dropIndex(['game_id', 'finished_at']);
        });

        Schema::table('solo_games', function (Blueprint $table) {
            $table->dropIndex(['player_id', 'status']);
        });

        Schema::table('solo_personal_bests', function (Blueprint $table) {
            $table->dropIndex(['player_id']);
        });

        Schema::table('daily_challenge_entries', function (Blueprint $table) {
            $table->dropIndex(['daily_challenge_id', 'completed_at']);
        });

        Schema::table('friendships', function (Blueprint $table) {
            $table->dropIndex(['sender_id']);
        });

        Schema::table('season_results', function (Blueprint $table) {
            $table->dropIndex(['season_id']);
        });
    }
};
