<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Preorder extends Model
{
    use HasFactory;

    protected $primaryKey = 'preorder_id';

    protected $fillable = [
        'user_id',
        'book_id',
        'quantity',
        'price_at_preorder',
        'status',
        'notes',
    ];

    protected $casts = [
        'price_at_preorder' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function book()
    {
        return $this->belongsTo(Book::class, 'book_id', 'book_id');
    }
}
