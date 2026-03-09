<?php

use App\Models\SoloGame;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solo_games', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('player_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('status', [SoloGame::STATUS_IN_PROGRESS, SoloGame::STATUS_COMPLETED])->default(SoloGame::STATUS_IN_PROGRESS);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solo_games');
    }
};
