<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('player_stats', function (Blueprint $table) {
            $table->unsignedInteger('daily_current_streak')->default(0)->after('best_win_streak');
            $table->unsignedInteger('daily_best_streak')->default(0)->after('daily_current_streak');
        });
    }

    public function down(): void
    {
        Schema::table('player_stats', function (Blueprint $table) {
            $table->dropColumn(['daily_current_streak', 'daily_best_streak']);
        });
    }
};
