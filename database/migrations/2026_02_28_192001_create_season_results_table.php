<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('season_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('season_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('player_id')->constrained();
            $table->integer('peak_elo');
            $table->integer('final_elo');
            $table->string('peak_rank');
            $table->integer('games_played')->default(0);
            $table->integer('games_won')->default(0);
            $table->timestamps();

            $table->unique(['season_id', 'player_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('season_results');
    }
};
