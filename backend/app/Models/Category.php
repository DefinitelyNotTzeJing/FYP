<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $primaryKey = 'category_id';

    protected $fillable = [
        'name',
        'slug',
        'description',
    ];

    // Relationship
    public function books()
    {
        return $this->hasMany(Book::class, 'category_id', 'category_id');
    }
}