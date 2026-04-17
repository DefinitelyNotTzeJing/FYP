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
        Schema::create('preorders', function (Blueprint $table) {
            $table->id('preorder_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('book_id');
            $table->integer('quantity')->default(1);
            $table->decimal('price_at_preorder', 10, 2);
            $table->enum('status', ['pending', 'cancelled', 'fulfilled'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            $table->foreign('book_id')->references('book_id')->on('books')->onDelete('cascade');
            $table->unique(['user_id', 'book_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('preorders');
    }
};
