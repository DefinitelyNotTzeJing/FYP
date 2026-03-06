<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    /**
     * Get all categories
     * Public access
     */
    public function index(Request $request)
    {
        try {
            $query = Category::query();

            // Search by name
            if ($request->has('search')) {
                $query->where('name', 'like', "%{$request->search}%");
            }

            $categories = $query->orderBy('name', 'asc')->get();

            return response()->json([
                'success' => true,
                'data'    => $categories,
                'total'   => $categories->count(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Failed to retrieve categories',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single category with its books
     * Public access
     */
    public function show($id)
    {
        try {
            $category = Category::with(['books.author'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data'    => $category,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Category not found',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Failed to retrieve category',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a new category
     * Admin only
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'name'        => 'required|string|max:255|unique:categories,name',
                'slug'        => 'sometimes|string|max:255|unique:categories,slug',
                'description' => 'nullable|string',
            ]);

            // Auto-generate slug from name if not provided
            $slug = $request->slug ?? Str::slug($request->name);

            // Ensure slug is unique if auto-generated
            $originalSlug = $slug;
            $count = 1;
            while (Category::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $count++;
            }

            $category = Category::create([
                'name'        => $request->name,
                'slug'        => $slug,
                'description' => $request->description,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Category created successfully',
                'data'    => $category,
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
                'error'   => 'Failed to create category',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update an existing category
     * Admin only
     */
    public function update(Request $request, $id)
    {
        try {
            $category = Category::findOrFail($id);

            $request->validate([
                'name'        => 'sometimes|string|max:255|unique:categories,name,' . $id . ',category_id',
                'slug'        => 'sometimes|string|max:255|unique:categories,slug,' . $id . ',category_id',
                'description' => 'sometimes|nullable|string',
            ]);

            $data = $request->only(['name', 'description']);

            // If name changed and no explicit slug provided, regenerate slug
            if ($request->has('name') && !$request->has('slug')) {
                $data['slug'] = Str::slug($request->name);
            } elseif ($request->has('slug')) {
                $data['slug'] = $request->slug;
            }

            $category->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Category updated successfully',
                'data'    => $category->fresh(),
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Category not found',
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
                'error'   => 'Failed to update category',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a category
     * Admin only
     */
    public function destroy($id)
    {
        try {
            $category = Category::findOrFail($id);

            // Prevent deletion if category has books
            $bookCount = $category->books()->count();
            if ($bookCount > 0) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Cannot delete category',
                    'message' => "This category has {$bookCount} book(s) associated. Remove or reassign them first.",
                ], 400);
            }

            $category->delete();

            return response()->json([
                'success' => true,
                'message' => 'Category deleted successfully',
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Category not found',
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Failed to delete category',
                'details' => $e->getMessage(),
            ], 500);
        }
    }
}