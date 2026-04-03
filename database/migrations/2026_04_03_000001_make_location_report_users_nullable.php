<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('location_reports', function (Blueprint $table) {
            $table->foreignId('reported_by_id')->nullable()->change();
        });

        Schema::table('location_report_votes', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('location_report_votes', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable(false)->change();
        });

        Schema::table('location_reports', function (Blueprint $table) {
            $table->foreignId('reported_by_id')->nullable(false)->change();
        });
    }
};
