<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Rating extends Model
{
    use HasFactory;

    protected $primaryKey = 'rating_id';

    protected $fillable = [
        'user_id',
        'book_id',
        'score',
    ];

    protected $casts = [
        'score' => 'integer',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function book()
    {
        return $this->belongsTo(Book::class, 'book_id', 'book_id');
    }

    // Automatically update book rating when rating is created/updated
    protected static function booted()
    {
        static::created(function ($rating) {
            $rating->book->updateRating();
        });

        static::updated(function ($rating) {
            $rating->book->updateRating();
        });

        static::deleted(function ($rating) {
            $rating->book->updateRating();
        });
    }
}