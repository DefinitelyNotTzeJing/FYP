<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id('book_id');
            $table->string('book_name');
            $table->text('book_description')->nullable();
            
            $table->unsignedBigInteger('author_id');
            $table->foreign('author_id')->references('author_id')->on('authors')->onDelete('cascade');
            
            $table->unsignedBigInteger('category_id');
            $table->foreign('category_id')->references('category_id')->on('categories')->onDelete('cascade');
            
            $table->string('cover_image_url')->nullable();
            $table->decimal('price', 10, 2);
            $table->integer('available_quantity')->default(0);
            $table->decimal('book_total_rating', 3, 2)->default(0.00);
            $table->integer('book_number_of_rating')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->timestamps();

            $table->engine = 'InnoDB';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};