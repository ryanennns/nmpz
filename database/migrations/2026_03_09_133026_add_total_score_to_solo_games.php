<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solo_games', function (Blueprint $table) {
            $table->smallInteger('score')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('solo_games', function (Blueprint $table) {
            $table->dropCOlumn('score');
        });
    }
};
