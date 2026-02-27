<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\FaceRecognitionController;
use App\Http\Controllers\Api\UserProfileController;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Books - public access
Route::get('/books', [BookController::class, 'index']);
Route::get('/books/search', [BookController::class, 'search']);
Route::get('/books/category/{category}', [BookController::class, 'byCategory']);
Route::get('/books/{id}', [BookController::class, 'show']);

// Face Recognition Routes
Route::get('/face/health', [FaceRecognitionController::class, 'healthCheck']);
Route::post('/face/verify', [FaceRecognitionController::class, 'verifyFace']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user', [AuthController::class, 'updateProfile']);
    Route::put('/password', [AuthController::class, 'changePassword']);

    // User Profile
    Route::get('/profile', [UserProfileController::class, 'show']);     // Get current user's profile
    Route::put('/profile', [UserProfileController::class, 'update']);   // Update current user's profile

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