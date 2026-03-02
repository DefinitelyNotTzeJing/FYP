<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Add payment verification method column
            $table->string('payment_verification_method', 50)
                  ->default('password')
                  ->after('payment_status')
                  ->comment('Method used to verify payment: password or facial_recognition');
            
            // Add face verification tracking columns
            $table->boolean('verified_by_face')
                  ->default(false)
                  ->after('payment_verification_method')
                  ->comment('TRUE if payment was verified using facial recognition');
            
            $table->decimal('face_verification_similarity', 5, 2)
                  ->nullable()
                  ->after('verified_by_face')
                  ->comment('Face matching similarity score (0.00-1.00)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'payment_verification_method',
                'verified_by_face',
                'face_verification_similarity'
            ]);
        });
    }
};