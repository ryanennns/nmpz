<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('player_one_id')->constrained('players')->restrictOnDelete();
            $table->foreignUuid('player_two_id')->constrained('players')->restrictOnDelete();
            $table->foreignUuid('winner_id')->nullable()->constrained('players')->nullOnDelete();
            $table->foreignUuid('map_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('seed');
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};
