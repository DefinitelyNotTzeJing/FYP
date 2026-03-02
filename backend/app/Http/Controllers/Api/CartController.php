<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Book;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    /**
     * Get current user's cart
     * Requires authentication
     */
    public function index()
    {
        try {
            $user = request()->user();

            $cartItems = Cart::where('user_id', $user->user_id)
                ->with(['book.author', 'book.category'])
                ->get();

            // Calculate totals
            $subtotal = $cartItems->sum(function ($item) {
                return $item->quantity * $item->book->price;
            });

            return response()->json([
                'success' => true,
                'data' => $cartItems,
                'summary' => [
                    'total_items' => $cartItems->count(),
                    'total_quantity' => $cartItems->sum('quantity'),
                    'subtotal' => number_format($subtotal, 2),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve cart',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add book to cart
     * Requires authentication
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();

            $validated = $request->validate([
                'book_id' => 'required|exists:books,book_id',
                'quantity' => 'required|integer|min:1',
            ]);

            // Check if book exists and has stock
            $book = Book::findOrFail($validated['book_id']);

            if ($book->available_quantity < $validated['quantity']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Insufficient stock',
                    'message' => "Only {$book->available_quantity} available"
                ], 400);
            }

            // Check if already in cart
            $existing = Cart::where('user_id', $user->user_id)
                ->where('book_id', $validated['book_id'])
                ->first();

            if ($existing) {
                // Update quantity
                $newQuantity = $existing->quantity + $validated['quantity'];

                if ($book->available_quantity < $newQuantity) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Insufficient stock',
                        'message' => "Only {$book->available_quantity} available, you already have {$existing->quantity} in cart"
                    ], 400);
                }

                $existing->update(['quantity' => $newQuantity]);

                return response()->json([
                    'success' => true,
                    'message' => 'Cart updated',
                    'data' => $existing->fresh()->load('book')
                ]);
            }

            // Add new item to cart
            $cartItem = Cart::create([
                'user_id' => $user->user_id,
                'book_id' => $validated['book_id'],
                'quantity' => $validated['quantity'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Book added to cart',
                'data' => $cartItem->load('book.author')
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to add to cart',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update cart item quantity
     * Requires authentication
     */
    public function update(Request $request, $bookId)
    {
        try {
            $user = $request->user();

            $validated = $request->validate([
                'quantity' => 'required|integer|min:1',
            ]);

            $cartItem = Cart::where('user_id', $user->user_id)
                ->where('book_id', $bookId)
                ->first();

            if (!$cartItem) {
                return response()->json([
                    'success' => false,
                    'error' => 'Item not found in cart'
                ], 404);
            }

            // Check stock
            $book = Book::findOrFail($bookId);

            if ($book->available_quantity < $validated['quantity']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Insufficient stock',
                    'message' => "Only {$book->available_quantity} available"
                ], 400);
            }

            $cartItem->update(['quantity' => $validated['quantity']]);

            return response()->json([
                'success' => true,
                'message' => 'Cart updated',
                'data' => $cartItem->fresh()->load('book')
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update cart',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove item from cart
     * Requires authentication
     */
    public function destroy($bookId)
    {
        try {
            $user = request()->user();

            $cartItem = Cart::where('user_id', $user->user_id)
                ->where('book_id', $bookId)
                ->first();

            if (!$cartItem) {
                return response()->json([
                    'success' => false,
                    'error' => 'Item not found in cart'
                ], 404);
            }

            $cartItem->delete();

            return response()->json([
                'success' => true,
                'message' => 'Item removed from cart'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to remove from cart',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear entire cart
     * Requires authentication
     */
    public function clear()
    {
        try {
            $user = request()->user();

            $deleted = Cart::where('user_id', $user->user_id)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Cart cleared',
                'deleted_items' => $deleted
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to clear cart',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}