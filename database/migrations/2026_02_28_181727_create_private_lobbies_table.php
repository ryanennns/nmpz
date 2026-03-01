<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('private_lobbies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('host_player_id')->constrained('players')->cascadeOnDelete();
            $table->string('invite_code', 8)->unique();
            $table->foreignUuid('map_id')->nullable()->constrained()->nullOnDelete();
            $table->string('match_format')->default('classic');
            $table->enum('status', ['waiting', 'started', 'expired'])->default('waiting');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('private_lobbies');
    }
};
