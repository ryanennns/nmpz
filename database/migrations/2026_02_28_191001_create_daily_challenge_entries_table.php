<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_challenge_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('daily_challenge_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('player_id')->constrained();
            $table->integer('total_score')->default(0);
            $table->json('round_scores')->nullable();
            $table->integer('rounds_completed')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['daily_challenge_id', 'player_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_challenge_entries');
    }
};
