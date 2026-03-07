<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    use HasFactory;

    protected $table = 'user_profiles';
    protected $primaryKey = 'user_id';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'profile_image_base64',
        'date_of_birth',
        'gender',
        'payment_method',
        'address',
        'phone',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    // Append age to JSON responses
    protected $appends = ['age'];

    // Auto-calculate age from date_of_birth
    protected function age(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->date_of_birth 
                ? $this->date_of_birth->age 
                : null
        );
    }

    // Relationship
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}