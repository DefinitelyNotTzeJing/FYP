<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Preorder;
use App\Models\Book;
use Illuminate\Http\Request;

class PreorderController extends Controller
{
    public function index()
    {
        try {
            $user = request()->user();

            $preorders = Preorder::where('user_id', $user->user_id)
                ->with(['book.author', 'book.category'])
                ->orderByDesc('created_at')
                ->get();

            return response()->json(['success' => true, 'data' => $preorders]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Failed to retrieve pre-orders', 'details' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $user = $request->user();

            $validated = $request->validate([
                'book_id'  => 'required|exists:books,book_id',
                'quantity' => 'integer|min:1',
                'notes'    => 'nullable|string|max:500',
            ]);

            $book = Book::findOrFail($validated['book_id']);

            if ($book->available_quantity > 0) {
                return response()->json(['success' => false, 'error' => 'Book is in stock — add to cart instead.'], 400);
            }

            $existing = Preorder::where('user_id', $user->user_id)
                ->where('book_id', $validated['book_id'])
                ->whereIn('status', ['pending'])
                ->first();

            if ($existing) {
                return response()->json(['success' => false, 'error' => 'You already have a pending pre-order for this book.'], 409);
            }

            $preorder = Preorder::create([
                'user_id'           => $user->user_id,
                'book_id'           => $validated['book_id'],
                'quantity'          => $validated['quantity'] ?? 1,
                'price_at_preorder' => $book->price,
                'status'            => 'pending',
                'notes'             => $validated['notes'] ?? null,
            ]);

            return response()->json(['success' => true, 'message' => 'Pre-order placed.', 'data' => $preorder->load('book.author')], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Failed to place pre-order', 'details' => $e->getMessage()], 500);
        }
    }

    public function cancel($preorderId)
    {
        try {
            $user = request()->user();

            $preorder = Preorder::where('preorder_id', $preorderId)
                ->where('user_id', $user->user_id)
                ->first();

            if (!$preorder) {
                return response()->json(['success' => false, 'error' => 'Pre-order not found.'], 404);
            }

            if ($preorder->status !== 'pending') {
                return response()->json(['success' => false, 'error' => 'Only pending pre-orders can be cancelled.'], 400);
            }

            $preorder->update(['status' => 'cancelled']);

            return response()->json(['success' => true, 'message' => 'Pre-order cancelled.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Failed to cancel pre-order', 'details' => $e->getMessage()], 500);
        }
    }

    // Admin: list all preorders
    public function getAll(Request $request)
    {
        try {
            $query = Preorder::with(['user', 'book.author', 'book.category'])
                ->orderByDesc('created_at');

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $preorders = $query->paginate(20);

            return response()->json(['success' => true, 'data' => $preorders]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Failed to retrieve pre-orders', 'details' => $e->getMessage()], 500);
        }
    }

    // Admin: update status
    public function updateStatus(Request $request, $preorderId)
    {
        try {
            $validated = $request->validate([
                'status' => 'required|in:pending,cancelled,fulfilled',
            ]);

            $preorder = Preorder::findOrFail($preorderId);
            $preorder->update(['status' => $validated['status']]);

            return response()->json(['success' => true, 'message' => 'Status updated.', 'data' => $preorder]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Failed to update status', 'details' => $e->getMessage()], 500);
        }
    }
}
