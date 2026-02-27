<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('elo_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('player_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('game_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('rating_before');
            $table->unsignedSmallInteger('rating_after');
            $table->smallInteger('rating_change');
            $table->unsignedSmallInteger('opponent_rating');
            $table->timestamps();

            $table->index(['player_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('elo_history');
    }
};
