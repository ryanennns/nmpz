<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('location_reports', function (Blueprint $table) {
            $table->unsignedInteger('votes_to_accept')->default(0)->after('status');
            $table->unsignedInteger('votes_to_reject')->default(0)->after('votes_to_accept');
        });

        Schema::create('location_report_votes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('location_report_id')
                ->constrained('location_reports')
                ->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('vote', ['keep', 'remove']);
            $table->timestamps();

            $table->unique(['location_report_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('location_report_votes');

        Schema::table('location_reports', function (Blueprint $table) {
            $table->dropColumn(['votes_to_accept', 'votes_to_reject']);
        });

        Schema::table('locations', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
