<?php

namespace App\Models;

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
        'username',
        'profile_image_url',
        'date_of_birth',
        'gender',
        'age',
        'payment_method',
        'address',
        'phone',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'age' => 'integer',
    ];

    // Relationship
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}