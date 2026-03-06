<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Author;
use Illuminate\Http\Request;

class AuthorController extends Controller
{
    /**
     * Get all authors
     * Public access
     */
    public function index(Request $request)
    {
        try {
            $query = Author::query();

            // Search by name
            if ($request->has('search')) {
                $query->where('name', 'like', "%{$request->search}%");
            }

            // Sort
            $sortBy = $request->get('sort_by', 'name');
            $sortOrder = $request->get('sort_order', 'asc');
            $allowedSorts = ['name', 'created_at'];
            if (in_array($sortBy, $allowedSorts)) {
                $query->orderBy($sortBy, $sortOrder);
            }

            $perPage = $request->get('per_page', 15);
            $authors = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $authors,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve authors',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single author with their books
     * Public access
     */
    public function show($id)
    {
        try {
            $author = Author::with(['books.category'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $author,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Author not found',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve author',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a new author
     * Admin only
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'name'      => 'required|string|max:255|unique:authors,name',
                'bio'       => 'nullable|string',
                'image_url' => 'nullable|url',
            ]);

            $author = Author::create([
                'name'      => $request->name,
                'bio'       => $request->bio,
                'image_url' => $request->image_url,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Author created successfully',
                'data'    => $author,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Validation failed',
                'details' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Failed to create author',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update an existing author
     * Admin only
     */
    public function update(Request $request, $id)
    {
        try {
            $author = Author::findOrFail($id);

            $request->validate([
                'name'      => 'sometimes|string|max:255|unique:authors,name,' . $id . ',author_id',
                'bio'       => 'sometimes|nullable|string',
                'image_url' => 'sometimes|nullable|url',
            ]);

            $author->update($request->only(['name', 'bio', 'image_url']));

            return response()->json([
                'success' => true,
                'message' => 'Author updated successfully',
                'data'    => $author->fresh(),
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Author not found',
            ], 404);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Validation failed',
                'details' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Failed to update author',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete an author
     * Admin only
     */
    public function destroy($id)
    {
        try {
            $author = Author::findOrFail($id);

            // Prevent deletion if author has books
            if ($author->books()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Cannot delete author',
                    'message' => 'This author has ' . $author->books()->count() . ' book(s) associated. Remove or reassign them first.',
                ], 400);
            }

            $author->delete();

            return response()->json([
                'success' => true,
                'message' => 'Author deleted successfully',
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Author not found',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Failed to delete author',
                'details' => $e->getMessage(),
            ], 500);
        }
    }
}