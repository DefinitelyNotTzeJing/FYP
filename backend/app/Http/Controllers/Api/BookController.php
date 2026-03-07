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
        try {
            $query = Book::with(['author', 'category']);

            if ($request->has('category_id')) {
                $query->where('category_id', $request->category_id);
            }
            if ($request->has('author_id')) {
                $query->where('author_id', $request->author_id);
            }
            if ($request->has('featured')) {
                $query->where('is_featured', true);
            }
            if ($request->has('in_stock')) {
                $query->where('available_quantity', '>', 0);
            }

            // Search by title, description, OR author name
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('book_name', 'like', "%{$search}%")
                      ->orWhere('book_description', 'like', "%{$search}%")
                      ->orWhereHas('author', function ($aq) use ($search) {
                          $aq->where('name', 'like', "%{$search}%");
                      });
                });
            }

            if ($request->has('min_price')) {
                $query->where('price', '>=', $request->min_price);
            }
            if ($request->has('max_price')) {
                $query->where('price', '<=', $request->max_price);
            }

            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $allowedSorts = ['created_at', 'price', 'book_name', 'book_total_rating', 'book_number_of_rating'];
            if (in_array($sortBy, $allowedSorts)) {
                $query->orderBy($sortBy, $sortOrder);
            }

            $perPage = $request->get('per_page', 15);
            $books = $query->paginate($perPage);

            return response()->json($books);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve books',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Search books
     */
    public function search(Request $request)
    {
        try {
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

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'details' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Search failed',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get books by category
     */
    public function byCategory($category)
    {
        try {
            $books = Book::with(['author', 'category'])
                ->whereHas('category', function ($q) use ($category) {
                    $q->where('slug', $category)->orWhere('category_id', $category);
                })
                ->paginate(15);

            return response()->json($books);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve books by category',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $book = Book::with(['author', 'category', 'ratings', 'reviews.user.profile'])
                ->findOrFail($id);

            return response()->json($book);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Book not found',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve book',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'book_name'          => 'required|string|max:255|unique:books,book_name',
                'book_description'   => 'nullable|string',
                'author_id'          => 'required|exists:authors,author_id',
                'category_id'        => 'required|exists:categories,category_id',
                'price'              => 'required|numeric|min:0',
                'available_quantity' => 'required|integer|min:0',
                'cover_image_url'    => 'nullable|url',
                'is_featured'        => 'sometimes|boolean',
            ]);

            $book = Book::create($request->all());

            return response()->json([
                'message' => 'Book created successfully',
                'book' => $book->load(['author', 'category']),
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'details' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to create book',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $book = Book::findOrFail($id);

            $request->validate([
                'book_name'          => 'sometimes|string|max:255|unique:books,book_name,' . $id . ',book_id',
                'book_description'   => 'sometimes|string',
                'author_id'          => 'sometimes|exists:authors,author_id',
                'category_id'        => 'sometimes|exists:categories,category_id',
                'price'              => 'sometimes|numeric|min:0',
                'available_quantity' => 'sometimes|integer|min:0',
                'cover_image_url'    => 'sometimes|url',
                'is_featured'        => 'sometimes|boolean',
            ]);

            $book->update($request->all());

            return response()->json([
                'message' => 'Book updated successfully',
                'book' => $book->load(['author', 'category']),
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Book not found',
            ], 404);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'details' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update book',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $book = Book::findOrFail($id);
            $book->delete();

            return response()->json([
                'message' => 'Book deleted successfully',
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Book not found',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to delete book',
                'details' => $e->getMessage(),
            ], 500);
        }
    }
}