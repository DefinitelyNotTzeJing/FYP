<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use Illuminate\Http\Request;

class BookController extends Controller
{
    /**
     * Get all books with filters
     */
    public function index(Request $request)
    {
        $query = Book::with(['author', 'category']);

        // Filter by category
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by author
        if ($request->has('author_id')) {
            $query->where('author_id', $request->author_id);
        }

        // Filter featured
        if ($request->has('featured')) {
            $query->where('is_featured', true);
        }

        // Filter in stock
        if ($request->has('in_stock')) {
            $query->where('available_quantity', '>', 0);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('book_name', 'like', "%{$search}%")
                  ->orWhere('book_description', 'like', "%{$search}%");
            });
        }

        // Price range
        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        
        $allowedSorts = ['created_at', 'price', 'book_name', 'book_total_rating', 'book_number_of_rating'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Paginate
        $perPage = $request->get('per_page', 15);
        $books = $query->paginate($perPage);

        return response()->json($books);
    }

    /**
     * Search books
     */
    public function search(Request $request)
    {
        $request->validate([
            'query' => 'required|string|min:2',
        ]);

        $books = Book::with(['author', 'category'])
            ->where('book_name', 'like', "%{$request->query}%")
            ->orWhere('book_description', 'like', "%{$request->query}%")
            ->orWhereHas('author', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->query}%");
            })
            ->paginate(15);

        return response()->json($books);
    }

    /**
     * Get books by category
     */
    public function byCategory($category)
    {
        $books = Book::with(['author', 'category'])
            ->whereHas('category', function ($q) use ($category) {
                $q->where('slug', $category)->orWhere('category_id', $category);
            })
            ->paginate(15);

        return response()->json($books);
    }

    /**
     * Get single book
     */
    public function show($id)
    {
        $book = Book::with(['author', 'category', 'ratings', 'reviews.user.profile'])
            ->findOrFail($id);

        return response()->json($book);
    }

    /**
     * Create book (Admin only)
     */
    public function store(Request $request)
    {
        $request->validate([
            'book_name' => 'required|string|max:255',
            'book_description' => 'nullable|string',
            'author_id' => 'required|exists:authors,author_id',
            'category_id' => 'required|exists:categories,category_id',
            'price' => 'required|numeric|min:0',
            'available_quantity' => 'required|integer|min:0',
            'cover_image_url' => 'nullable|url',
            'is_featured' => 'sometimes|boolean',
        ]);

        $book = Book::create($request->all());

        return response()->json([
            'message' => 'Book created successfully',
            'book' => $book->load(['author', 'category']),
        ], 201);
    }

    /**
     * Update book (Admin only)
     */
    public function update(Request $request, $id)
    {
        $book = Book::findOrFail($id);

        $request->validate([
            'book_name' => 'sometimes|string|max:255',
            'book_description' => 'sometimes|string',
            'author_id' => 'sometimes|exists:authors,author_id',
            'category_id' => 'sometimes|exists:categories,category_id',
            'price' => 'sometimes|numeric|min:0',
            'available_quantity' => 'sometimes|integer|min:0',
            'cover_image_url' => 'sometimes|url',
            'is_featured' => 'sometimes|boolean',
        ]);

        $book->update($request->all());

        return response()->json([
            'message' => 'Book updated successfully',
            'book' => $book->load(['author', 'category']),
        ]);
    }

    /**
     * Delete book (Admin only)
     */
    public function destroy($id)
    {
        $book = Book::findOrFail($id);
        $book->delete();

        return response()->json([
            'message' => 'Book deleted successfully',
        ]);
    }
}