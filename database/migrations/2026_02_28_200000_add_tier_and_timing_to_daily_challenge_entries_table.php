<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_challenge_entries', function (Blueprint $table) {
            $table->string('tier')->nullable()->after('completed_at');
            $table->timestamp('started_at')->nullable()->after('tier');
            $table->timestamp('round_started_at')->nullable()->after('started_at');
        });
    }

    public function down(): void
    {
        Schema::table('daily_challenge_entries', function (Blueprint $table) {
            $table->dropColumn(['tier', 'started_at', 'round_started_at']);
        });
    }
};
