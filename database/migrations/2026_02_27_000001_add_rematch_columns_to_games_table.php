<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->boolean('player_one_rematch_requested')->default(false);
            $table->boolean('player_two_rematch_requested')->default(false);
            $table->foreignUuid('rematch_game_id')->nullable()->constrained('games')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropForeign(['rematch_game_id']);
            $table->dropColumn(['player_one_rematch_requested', 'player_two_rematch_requested', 'rematch_game_id']);
        });
    }
};
