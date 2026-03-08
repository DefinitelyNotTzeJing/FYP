<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Book;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * Get checkout summary with available authentication methods
     */
    public function getCheckoutSummary()
    {
        try {
            $user = request()->user();

            // Get cart items with book and author details
            $cartItems = Cart::where('user_id', $user->user_id)
                ->with('book.author')
                ->get();

            if ($cartItems->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Cart is empty',
                    'message' => 'Please add items to cart before checkout'
                ], 400);
            }

            // Calculate pricing
            $subtotal = $cartItems->sum(function ($item) {
                return $item->quantity * $item->book->price;
            });

            $shipping = 5.00;
            $tax = $subtotal * 0.06; // 6% tax
            $total = $subtotal + $shipping + $tax;

            return response()->json([
                'success' => true,
                'data' => [
                    'items' => $cartItems,
                    'pricing' => [
                        'subtotal' => number_format($subtotal, 2),
                        'shipping' => number_format($shipping, 2),
                        'tax' => number_format($tax, 2),
                        'total' => number_format($total, 2),
                    ],
                    'user' => [
                        'has_face_registered' => !is_null($user->face_embedding),
                        'saved_payment_method' => $user->profile ? ($user->profile->payment_method ?? 'None') : 'None',
                        'shipping_address' => $user->profile ? $user->profile->address : null,
                    ],
                    'available_authentication_methods' => [
                        'password' => true,
                        'facial_recognition' => !is_null($user->face_embedding),
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Checkout summary failed', [
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to get checkout summary',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify payment with password
     */
    public function verifyPaymentWithPassword(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
            'payment_method' => 'required|string|in:Credit Card,Debit Card,PayPal,Cash on Delivery',
            'shipping_address' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $user = $request->user();

        // Verify password
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid password',
                'message' => 'The password you entered is incorrect'
            ], 401);
        }

        // Process payment
        $result = $this->processPayment(
            $user,
            'password',
            $request->payment_method,
            $request->shipping_address,
            $request->notes
        );

        return $result;
    }

    /**
     * Verify payment with facial recognition
     */
    public function verifyPaymentWithFace(Request $request)
    {
        $request->validate([
            'image' => 'required|string',
            'payment_method' => 'required|string|in:Credit Card,Debit Card,PayPal,Cash on Delivery',
            'shipping_address' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $user = $request->user();

        // Check if user has registered face
        if (is_null($user->face_embedding)) {
            return response()->json([
                'success' => false,
                'error' => 'Face not registered',
                'message' => 'Please register your face first or use password authentication'
            ], 400);
        }

        try {
            // Call Python API for face verification
            $response = Http::timeout(10)->post('http://localhost:5000/verify-face', [
                'image' => $request->image,
                'stored_embedding' => $user->face_embedding,
                'threshold' => 0.6
            ]);

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Face verification service unavailable',
                    'message' => 'Unable to connect to facial recognition service'
                ], 503);
            }

            $verificationResult = $response->json();

            // Check if face matches (threshold: 0.6)
            if (!$verificationResult['match'] || $verificationResult['similarity'] < 0.6) {
                return response()->json([
                    'success' => false,
                    'error' => 'Face verification failed',
                    'message' => 'Face does not match. Please try again or use password authentication',
                    'similarity' => $verificationResult['similarity']
                ], 401);
            }

            // Process payment with face verification data
            $result = $this->processPayment(
                $user,
                'facial_recognition',
                $request->payment_method,
                $request->shipping_address,
                $request->notes,
                $verificationResult['similarity']
            );

            return $result;

        } catch (\Exception $e) {
            Log::error('Face verification failed', [
                'error' => $e->getMessage(),
                'user_id' => $user->user_id
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Face verification error',
                'message' => 'An error occurred during face verification. Please try again or use password authentication'
            ], 500);
        }
    }

    /**
     * Process payment and create order (shared logic)
     */
    private function processPayment(
        $user, 
        $verificationMethod, 
        $paymentMethod, 
        $shippingAddress = null, 
        $notes = null,
        $faceSimilarity = null
    ) {
        DB::beginTransaction();

        try {
            // Get cart items
            $cartItems = Cart::where('user_id', $user->user_id)
                ->with('book')
                ->get();

            if ($cartItems->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Cart is empty',
                    'message' => 'Cannot process payment with empty cart'
                ], 400);
            }

            // Check stock availability
            foreach ($cartItems as $item) {
                if ($item->book->available_quantity < $item->quantity) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'error' => 'Insufficient stock',
                        'message' => "Only {$item->book->available_quantity} units of '{$item->book->book_name}' available"
                    ], 400);
                }
            }

            // Calculate total
            $totalAmount = $cartItems->sum(function ($item) {
                return $item->quantity * $item->book->price;
            });

            // Use user's address if not provided
            if (is_null($shippingAddress) && $user->profile) {
                $shippingAddress = $user->profile->address;
            }

            // Generate unique order number
            $orderNumber = Order::generateOrderNumber();

            // Create order
            $order = Order::create([
                'user_id' => $user->user_id,
                'order_number' => $orderNumber,
                'total_amount' => $totalAmount,
                'status' => 'processing',
                'payment_status' => 'paid',
                'payment_verification_method' => $verificationMethod,
                'verified_by_face' => $verificationMethod === 'facial_recognition',
                'face_verification_similarity' => $faceSimilarity,
                'payment_method' => $paymentMethod,
                'shipping_address' => $shippingAddress,
                'notes' => $notes
            ]);

            // Create order items and update stock
            foreach ($cartItems as $cartItem) {
                $itemTotal = $cartItem->quantity * $cartItem->book->price;
                
                // Create order item
                OrderItem::create([
                    'order_id' => $order->order_id,
                    'book_id' => $cartItem->book_id,
                    'quantity' => $cartItem->quantity,
                    'price' => $cartItem->book->price,
                    'total' => $itemTotal
                ]);

                // Update book stock
                $cartItem->book->decrement('available_quantity', $cartItem->quantity);
            }

            // Clear user's cart
            Cart::where('user_id', $user->user_id)->delete();

            DB::commit();

            // Load order with items for response
            $order->load('items.book');

            return response()->json([
                'success' => true,
                'message' => 'Payment verified and order placed successfully',
                'data' => [
                    'order' => $order,
                    'verification' => [
                        'method' => $verificationMethod,
                        'similarity' => $faceSimilarity,
                        'verified_at' => now()->toISOString()
                    ]
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Payment processing failed', [
                'error' => $e->getMessage(),
                'user_id' => $user->user_id,
                'verification_method' => $verificationMethod
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Payment processing failed',
                'message' => 'An error occurred while processing your payment. Please try again.'
            ], 500);
        }
    }
}