<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wishlist;
use App\Models\Book;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    /**
     * Get current user's wishlist
     * Requires authentication
     */
    public function index()
    {
        try {
            $user = request()->user();

            $wishlist = Wishlist::where('user_id', $user->user_id)
                ->with(['book.author', 'book.category'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $wishlist,
                'total_items' => $wishlist->count()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve wishlist',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add book to wishlist
     * Requires authentication
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();

            $validated = $request->validate([
                'book_id' => 'required|exists:books,book_id',
            ]);

            // Check if already in wishlist
            $existing = Wishlist::where('user_id', $user->user_id)
                ->where('book_id', $validated['book_id'])
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'error' => 'Book already in wishlist'
                ], 400);
            }

            // Check if book exists and is available
            $book = Book::findOrFail($validated['book_id']);

            // Add to wishlist
            $wishlist = Wishlist::create([
                'user_id' => $user->user_id,
                'book_id' => $validated['book_id'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Book added to wishlist',
                'data' => $wishlist->load('book.author')
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
                'error' => 'Failed to add to wishlist',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove book from wishlist
     * Requires authentication
     */
    public function destroy($bookId)
    {
        try {
            $user = request()->user();

            $wishlist = Wishlist::where('user_id', $user->user_id)
                ->where('book_id', $bookId)
                ->first();

            if (!$wishlist) {
                return response()->json([
                    'success' => false,
                    'error' => 'Book not found in wishlist'
                ], 404);
            }

            $wishlist->delete();

            return response()->json([
                'success' => true,
                'message' => 'Book removed from wishlist'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to remove from wishlist',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if book is in user's wishlist
     * Requires authentication
     */
    public function check($bookId)
    {
        try {
            $user = request()->user();

            $inWishlist = Wishlist::where('user_id', $user->user_id)
                ->where('book_id', $bookId)
                ->exists();

            return response()->json([
                'success' => true,
                'in_wishlist' => $inWishlist
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to check wishlist',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear entire wishlist
     * Requires authentication
     */
    public function clear()
    {
        try {
            $user = request()->user();

            $deleted = Wishlist::where('user_id', $user->user_id)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Wishlist cleared',
                'deleted_items' => $deleted
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to clear wishlist',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}