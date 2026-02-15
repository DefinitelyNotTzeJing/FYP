<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wishlists', function (Blueprint $table) {
            $table->id('wishlist_id');
            
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            
            $table->unsignedBigInteger('book_id');
            $table->foreign('book_id')->references('book_id')->on('books')->onDelete('cascade');
            
            $table->timestamps();

            // Prevent duplicate entries
            $table->unique(['user_id', 'book_id']);

            $table->engine = 'InnoDB';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlists');
    }
};