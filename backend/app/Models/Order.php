<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $primaryKey = 'order_id';

    protected $fillable = [
        'user_id',
        'order_number',
        'total_amount',
        'status',
        'payment_status',
        'payment_verification_method',
        'verified_by_face',
        'face_verification_similarity',
        'payment_method',
        'shipping_address',
        'notes'
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'verified_by_face' => 'boolean',
        'face_verification_similarity' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class, 'order_id', 'order_id');
    }

    // Alias for items (for backward compatibility)
    public function orderItems()
    {
        return $this->items();
    }

    // Helper method: Generate unique order number
    public static function generateOrderNumber()
    {
        return 'ORD-' . strtoupper(uniqid());
    }

    // Helper method: Get total items count
    public function getTotalItemsAttribute()
    {
        return $this->items->count();
    }

    // Helper method: Get total quantity
    public function getTotalQuantityAttribute()
    {
        return $this->items->sum('quantity');
    }

    // Scopes
    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }

    public function scopeVerifiedByFace($query)
    {
        return $query->where('verified_by_face', true);
    }

    public function scopeVerifiedByPassword($query)
    {
        return $query->where('payment_verification_method', 'password');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeProcessing($query)
    {
        return $query->where('status', 'processing');
    }

    public function scopeShipped($query)
    {
        return $query->where('status', 'shipped');
    }

    public function scopeDelivered($query)
    {
        return $query->where('status', 'delivered');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }
}