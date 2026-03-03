<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Book extends Model
{
    use HasFactory;

    protected $primaryKey = 'book_id';

    protected $fillable = [
        'book_name',
        'book_description',
        'author_id',
        'category_id',
        'cover_image_url',
        'price',
        'available_quantity',
        'book_total_rating',
        'book_number_of_rating',
        'is_featured',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'available_quantity' => 'integer',
        'book_total_rating' => 'decimal:2',
        'book_number_of_rating' => 'integer',
        'is_featured' => 'boolean',
    ];

    // Relationships
    public function author()
    {
        return $this->belongsTo(Author::class, 'author_id', 'author_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    public function carts()
    {
        return $this->hasMany(Cart::class, 'book_id', 'book_id');
    }

    public function wishlists()
    {
        return $this->hasMany(Wishlist::class, 'book_id', 'book_id');
    }

    public function ratings()
    {
        return $this->hasMany(Rating::class, 'book_id', 'book_id');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'book_id', 'book_id');
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'book_id', 'book_id');
    }

    // Helper method: Check if book is in stock
    public function isInStock()
    {
        return $this->available_quantity > 0;
    }

    public function scopeInStock($query)
    {
        return $query->where('available_quantity', '>', 0);
    }

    // Helper method: Calculate average rating
    public function updateRating()
    {
        $avgRating = $this->ratings()->avg('score');
        $ratingCount = $this->ratings()->count();

        $this->update([
            'book_total_rating' => $avgRating ?? 0,
            'book_number_of_rating' => $ratingCount,
        ]);
    }
}