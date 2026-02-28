<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rivalries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('player_one_id')->constrained('players');
            $table->foreignUuid('player_two_id')->constrained('players');
            $table->integer('consecutive_rematches')->default(0);
            $table->integer('total_games')->default(0);
            $table->integer('player_one_wins')->default(0);
            $table->integer('player_two_wins')->default(0);
            $table->timestamps();

            $table->unique(['player_one_id', 'player_two_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rivalries');
    }
};
