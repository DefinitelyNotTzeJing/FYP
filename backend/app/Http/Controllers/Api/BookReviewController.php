<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rating;
use App\Models\Review;
use App\Models\Book;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookReviewController extends Controller
{
    /**
     * Submit a rating and optional review for a book
     * Requires authentication
     * 
     * Creates entries in BOTH ratings and reviews tables
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();

            // Validate input
            $validated = $request->validate([
                'book_id' => 'required|exists:books,book_id',
                'score' => 'required|integer|min:1|max:5',
                'comment' => 'nullable|string|max:1000',
            ]);

            // Check if user already rated this book
            $existingRating = Rating::where('user_id', $user->user_id)
                ->where('book_id', $validated['book_id'])
                ->first();

            if ($existingRating) {
                return response()->json([
                    'success' => false,
                    'error' => 'You have already rated this book',
                    'message' => 'Use the update endpoint to change your rating/review'
                ], 400);
            }

            // Use transaction to ensure both rating and review are created together
            DB::beginTransaction();
            
            try {
                // Create rating in ratings table
                $rating = Rating::create([
                    'user_id' => $user->user_id,
                    'book_id' => $validated['book_id'],
                    'score' => $validated['score'],
                ]);

                // Create review in reviews table (if comment provided)
                $review = null;
                if (!empty($validated['comment'])) {
                    $review = Review::create([
                        'user_id' => $user->user_id,
                        'book_id' => $validated['book_id'],
                        'comment' => $validated['comment'],
                    ]);
                }

                // Update book's average rating and review count
                $this->updateBookRatingStats($validated['book_id']);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Rating submitted successfully',
                    'data' => [
                        'rating' => $rating,
                        'review' => $review,
                        'user' => [
                            'user_id' => $user->user_id,
                            'username' => $user->username,
                        ]
                    ]
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to submit rating',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user's existing rating and/or review
     * Requires authentication
     * 
     * Updates entries in BOTH ratings and reviews tables
     */
    public function update(Request $request, $bookId)
    {
        try {
            $user = $request->user();

            // Find the rating
            $rating = Rating::where('user_id', $user->user_id)
                ->where('book_id', $bookId)
                ->first();

            if (!$rating) {
                return response()->json([
                    'success' => false,
                    'error' => 'Rating not found',
                    'message' => 'You have not rated this book yet'
                ], 404);
            }

            // Validate input
            $validated = $request->validate([
                'score' => 'sometimes|integer|min:1|max:5',
                'comment' => 'nullable|string|max:1000',
            ]);

            DB::beginTransaction();

            try {
                // Update rating if score is provided
                if (isset($validated['score'])) {
                    $rating->update(['score' => $validated['score']]);
                }

                // Handle review (comment)
                if ($request->has('comment')) {
                    $review = Review::where('user_id', $user->user_id)
                        ->where('book_id', $bookId)
                        ->first();

                    if (empty($validated['comment'])) {
                        // Delete review if comment is empty/null
                        if ($review) {
                            $review->delete();
                        }
                    } else {
                        // Update or create review
                        if ($review) {
                            $review->update(['comment' => $validated['comment']]);
                        } else {
                            $review = Review::create([
                                'user_id' => $user->user_id,
                                'book_id' => $bookId,
                                'comment' => $validated['comment'],
                            ]);
                        }
                    }
                }

                // Update book's average rating
                $this->updateBookRatingStats($bookId);

                DB::commit();

                // Get updated data
                $updatedRating = Rating::where('user_id', $user->user_id)
                    ->where('book_id', $bookId)
                    ->first();
                    
                $updatedReview = Review::where('user_id', $user->user_id)
                    ->where('book_id', $bookId)
                    ->first();

                return response()->json([
                    'success' => true,
                    'message' => 'Rating updated successfully',
                    'data' => [
                        'rating' => $updatedRating,
                        'review' => $updatedReview,
                    ]
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update rating',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete user's rating and review
     * Requires authentication
     * 
     * Deletes entries from BOTH ratings and reviews tables
     */
    public function destroy($bookId)
    {
        try {
            $user = request()->user();

            // Find the rating
            $rating = Rating::where('user_id', $user->user_id)
                ->where('book_id', $bookId)
                ->first();

            if (!$rating) {
                return response()->json([
                    'success' => false,
                    'error' => 'Rating not found',
                    'message' => 'You have not rated this book'
                ], 404);
            }

            DB::beginTransaction();

            try {
                // Delete rating from ratings table
                $rating->delete();

                // Delete review from reviews table (if exists)
                Review::where('user_id', $user->user_id)
                    ->where('book_id', $bookId)
                    ->delete();

                // Update book's average rating
                $this->updateBookRatingStats($bookId);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Rating and review deleted successfully'
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to delete rating',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all ratings and reviews for a specific book
     * Public endpoint
     * 
     * Joins data from BOTH ratings and reviews tables
     */
    public function getBookReviews($bookId)
    {
        try {
            $book = Book::findOrFail($bookId);

            // Get all ratings with their associated reviews
            $ratings = Rating::where('book_id', $bookId)
                ->with(['user.profile'])
                ->get();

            // Attach reviews to ratings
            $ratingsWithReviews = $ratings->map(function ($rating) use ($bookId) {
                $review = Review::where('user_id', $rating->user_id)
                    ->where('book_id', $bookId)
                    ->first();

                return [
                    'rating_id' => $rating->rating_id,
                    'user_id' => $rating->user_id,
                    'score' => $rating->score,
                    'comment' => $review ? $review->comment : null,
                    'review_id' => $review ? $review->review_id : null,
                    'created_at' => $rating->created_at,
                    'user' => [
                        'user_id' => $rating->user->user_id,
                        'username' => $rating->user->username,
                        'profile_image_url' => $rating->user->profile->profile_image_url ?? null,
                    ]
                ];
            });

            // Sort by newest first
            $sorted = $ratingsWithReviews->sortByDesc('created_at')->values();

            // Paginate manually (10 per page)
            $page = request()->get('page', 1);
            $perPage = 10;
            $total = $sorted->count();
            $items = $sorted->slice(($page - 1) * $perPage, $perPage)->values();

            return response()->json([
                'success' => true,
                'book' => [
                    'book_id' => $book->book_id,
                    'book_name' => $book->book_name,
                    'book_total_rating' => $book->book_total_rating,
                    'book_number_of_rating' => $book->book_number_of_rating,
                ],
                'reviews' => $items,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => ceil($total / $perPage),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve reviews',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current user's rating and review for a specific book
     * Requires authentication
     * 
     * Gets data from BOTH ratings and reviews tables
     */
    public function getUserReview($bookId)
    {
        try {
            $user = request()->user();

            // Get rating
            $rating = Rating::where('user_id', $user->user_id)
                ->where('book_id', $bookId)
                ->first();

            if (!$rating) {
                return response()->json([
                    'success' => true,
                    'has_rated' => false,
                    'data' => null
                ]);
            }

            // Get review (if exists)
            $review = Review::where('user_id', $user->user_id)
                ->where('book_id', $bookId)
                ->first();

            return response()->json([
                'success' => true,
                'has_rated' => true,
                'data' => [
                    'rating_id' => $rating->rating_id,
                    'score' => $rating->score,
                    'review_id' => $review ? $review->review_id : null,
                    'comment' => $review ? $review->comment : null,
                    'created_at' => $rating->created_at,
                    'updated_at' => $rating->updated_at,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve your review',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all ratings and reviews submitted by current user
     * Requires authentication
     * 
     * Gets data from BOTH ratings and reviews tables
     */
    public function getMyReviews()
    {
        try {
            $user = request()->user();

            // Get all user's ratings
            $ratings = Rating::where('user_id', $user->user_id)
                ->with('book.author')
                ->orderBy('created_at', 'desc')
                ->get();

            // Attach reviews to ratings
            $ratingsWithReviews = $ratings->map(function ($rating) {
                $review = Review::where('user_id', $rating->user_id)
                    ->where('book_id', $rating->book_id)
                    ->first();

                return [
                    'rating_id' => $rating->rating_id,
                    'score' => $rating->score,
                    'review_id' => $review ? $review->review_id : null,
                    'comment' => $review ? $review->comment : null,
                    'created_at' => $rating->created_at,
                    'book' => [
                        'book_id' => $rating->book->book_id,
                        'book_name' => $rating->book->book_name,
                        'cover_image_url' => $rating->book->cover_image_url,
                        'author' => [
                            'author_id' => $rating->book->author->author_id,
                            'name' => $rating->book->author->name,
                        ]
                    ]
                ];
            });

            // Paginate manually
            $page = request()->get('page', 1);
            $perPage = 10;
            $total = $ratingsWithReviews->count();
            $items = $ratingsWithReviews->slice(($page - 1) * $perPage, $perPage)->values();

            return response()->json([
                'success' => true,
                'data' => $items,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => ceil($total / $perPage),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve your reviews',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper function to update book's rating statistics
     * Calculates from ratings table only
     */
    private function updateBookRatingStats($bookId)
    {
        $stats = Rating::where('book_id', $bookId)
            ->selectRaw('AVG(score) as avg_rating, COUNT(*) as total_ratings')
            ->first();

        Book::where('book_id', $bookId)->update([
            'book_total_rating' => round($stats->avg_rating, 2) ?? 0,
            'book_number_of_rating' => $stats->total_ratings ?? 0,
        ]);
    }
}