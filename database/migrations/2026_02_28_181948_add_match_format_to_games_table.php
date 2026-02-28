<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->string('match_format')->default('classic');
            $table->unsignedTinyInteger('player_one_wins')->default(0);
            $table->unsignedTinyInteger('player_two_wins')->default(0);
            $table->unsignedTinyInteger('max_rounds')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn(['match_format', 'player_one_wins', 'player_two_wins', 'max_rounds']);
        });
    }
};
