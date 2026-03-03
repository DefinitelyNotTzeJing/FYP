<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\FaceRecognitionController;
use App\Http\Controllers\Api\UserProfileController;
use App\Http\Controllers\Api\BookReviewController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PasswordResetController;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/password/forgot',      [PasswordResetController::class, 'forgotPassword']);
Route::post('/password/verify-otp',  [PasswordResetController::class, 'verifyOtp']);
Route::post('/password/reset',       [PasswordResetController::class, 'resetPassword']);

// Books - public access
Route::get('/books', [BookController::class, 'index']);
Route::get('/books/search', [BookController::class, 'search']);
Route::get('/books/category/{category}', [BookController::class, 'byCategory']);
Route::get('/books/{id}', [BookController::class, 'show']);

// Book Reviews - public access
Route::get('/books/{bookId}/reviews', [BookReviewController::class, 'getBookReviews']);

// Face Recognition Routes
Route::get('/face/health', [FaceRecognitionController::class, 'healthCheck']);
Route::post('/face/verify', [FaceRecognitionController::class, 'verifyFace']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user', [AuthController::class, 'updateProfile']);
    Route::post('/password/change', [PasswordResetController::class, 'changePassword']);

    // User Profile
    Route::get('/profile', [UserProfileController::class, 'show']);     // Get current user's profile
    Route::put('/profile', [UserProfileController::class, 'update']);   // Update current user's profile

    // Wishlist
    Route::get('/wishlist', [WishlistController::class, 'index']);                      // Get user's wishlist
    Route::post('/wishlist', [WishlistController::class, 'store']);                     // Add book to wishlist
    Route::delete('/wishlist/{bookId}', [WishlistController::class, 'destroy']);        // Remove book from wishlist
    Route::get('/wishlist/check/{bookId}', [WishlistController::class, 'check']);       // Check if book is in wishlist
    Route::delete('/wishlist', [WishlistController::class, 'clear']);                   // Clear entire wishlist

    // Cart
    Route::get('/cart', [CartController::class, 'index']);                  // Get user's cart    
    Route::post('/cart', [CartController::class, 'store']);                 // Add book to cart    
    Route::put('/cart/{bookId}', [CartController::class, 'update']);        // Update cart item quantity
    Route::delete('/cart/{bookId}', [CartController::class, 'destroy']);    // Remove item from cart
    Route::delete('/cart', [CartController::class, 'clear']);               // Clear entire cart

    // Payment
    Route::post('/payment/verify-password', [PaymentController::class, 'verifyPaymentWithPassword']);   // Verify payment with password
    Route::post('/payment/verify-face', [PaymentController::class, 'verifyPaymentWithFace']);           // Verify payment with facial recognition
    Route::get('/checkout/summary', [PaymentController::class, 'getCheckoutSummary']);                  // Get checkout summary

    // Orders
    Route::get('/orders', [OrderController::class, 'index']);           // Get order history
    Route::get('/orders/{orderId}', [OrderController::class, 'show']);  // Get order details

    // Book Rating and Reviews
    Route::post('/book-reviews', [BookReviewController::class, 'store']);                       // Submit a rating and review for a book
    Route::put('/book-reviews/{bookId}', [BookReviewController::class, 'update']);              // Update user's own rating/review
    Route::delete('/book-reviews/{bookId}', [BookReviewController::class, 'destroy']);          // Delete user's own rating/review
    Route::get('/books/{bookId}/my-review', [BookReviewController::class, 'getUserReview']);    // Get current user's rating/review for a specific book
    Route::get('/my-reviews', [BookReviewController::class, 'getMyReviews']);                   // Get all ratings/reviews submitted by current user

    // Face Recognition - Protected
    Route::post('/face/register', [FaceRecognitionController::class, 'registerFace']);
    Route::delete('/face/remove', [FaceRecognitionController::class, 'removeFace']);
    Route::get('/face/status', [FaceRecognitionController::class, 'checkFaceStatus']);

    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);

    // Admin routes
    Route::middleware('admin')->group(function () {
        // Books management
        Route::post('/books', [BookController::class, 'store']);
        Route::put('/books/{id}', [BookController::class, 'update']);
        Route::delete('/books/{id}', [BookController::class, 'destroy']);

        // Orders management
        Route::get('/admin/orders', [OrderController::class, 'getAllOrders']);
        Route::put('/admin/orders/{id}/status', [OrderController::class, 'updateStatus']);
    });
});