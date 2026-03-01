<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->index('player_one_id');
            $table->index('player_two_id');
            $table->index('winner_id');
            $table->index('map_id');
            $table->index('status');
        });

        Schema::table('locations', function (Blueprint $table) {
            $table->index('map_id');
        });

        Schema::table('elo_history', function (Blueprint $table) {
            $table->index('game_id');
        });

        Schema::table('player_achievements', function (Blueprint $table) {
            $table->index('achievement_id');
        });

        Schema::table('daily_challenges', function (Blueprint $table) {
            $table->index('map_id');
        });

        Schema::table('daily_challenge_entries', function (Blueprint $table) {
            $table->index('player_id');
        });

        Schema::table('spectators', function (Blueprint $table) {
            $table->index('game_id');
            $table->index('player_id');
        });

        Schema::table('private_lobbies', function (Blueprint $table) {
            $table->index('host_player_id');
            $table->index('map_id');
        });

        Schema::table('friendships', function (Blueprint $table) {
            $table->index('receiver_id');
            $table->index('status');
        });

        Schema::table('rivalries', function (Blueprint $table) {
            $table->index('player_two_id');
        });

        Schema::table('season_results', function (Blueprint $table) {
            $table->index('player_id');
        });

        Schema::table('solo_games', function (Blueprint $table) {
            $table->index('map_id');
        });

        Schema::table('solo_personal_bests', function (Blueprint $table) {
            $table->index('map_id');
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropIndex(['player_one_id']);
            $table->dropIndex(['player_two_id']);
            $table->dropIndex(['winner_id']);
            $table->dropIndex(['map_id']);
            $table->dropIndex(['status']);
        });

        Schema::table('locations', function (Blueprint $table) {
            $table->dropIndex(['map_id']);
        });

        Schema::table('elo_history', function (Blueprint $table) {
            $table->dropIndex(['game_id']);
        });

        Schema::table('player_achievements', function (Blueprint $table) {
            $table->dropIndex(['achievement_id']);
        });

        Schema::table('daily_challenges', function (Blueprint $table) {
            $table->dropIndex(['map_id']);
        });

        Schema::table('daily_challenge_entries', function (Blueprint $table) {
            $table->dropIndex(['player_id']);
        });

        Schema::table('spectators', function (Blueprint $table) {
            $table->dropIndex(['game_id']);
            $table->dropIndex(['player_id']);
        });

        Schema::table('private_lobbies', function (Blueprint $table) {
            $table->dropIndex(['host_player_id']);
            $table->dropIndex(['map_id']);
        });

        Schema::table('friendships', function (Blueprint $table) {
            $table->dropIndex(['receiver_id']);
            $table->dropIndex(['status']);
        });

        Schema::table('rivalries', function (Blueprint $table) {
            $table->dropIndex(['player_two_id']);
        });

        Schema::table('season_results', function (Blueprint $table) {
            $table->dropIndex(['player_id']);
        });

        Schema::table('solo_games', function (Blueprint $table) {
            $table->dropIndex(['map_id']);
        });

        Schema::table('solo_personal_bests', function (Blueprint $table) {
            $table->dropIndex(['map_id']);
        });
    }
};
