<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = User::with('profile')
                ->withCount('orders');

            if ($search = $request->query('search')) {
                $query->where(function ($q) use ($search) {
                    $q->where('username', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            $users = $query->orderBy('created_at', 'desc')->paginate(15);

            $data = $users->map(function ($u) {
                return [
                    'user_id'            => $u->user_id,
                    'username'           => $u->username,
                    'email'              => $u->email,
                    'is_admin'           => $u->is_admin,
                    'face_registered'    => !is_null($u->face_registered_at),
                    'face_registered_at' => $u->face_registered_at,
                    'orders_count'       => $u->orders_count,
                    'created_at'         => $u->created_at,
                    'profile' => $u->profile ? [
                        'phone'         => $u->profile->phone,
                        'gender'        => $u->profile->gender,
                        'date_of_birth' => $u->profile->date_of_birth,
                        'address'       => $u->profile->address,
                        'payment_method'=> $u->profile->payment_method,
                    ] : null,
                ];
            });

            return response()->json([
                'success'      => true,
                'data'         => $data,
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'total'        => $users->total(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        try {
            $u = User::with(['profile', 'orders'])->withCount('orders')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id'            => $u->user_id,
                    'username'           => $u->username,
                    'email'              => $u->email,
                    'is_admin'           => $u->is_admin,
                    'face_registered'    => !is_null($u->face_registered_at),
                    'face_registered_at' => $u->face_registered_at,
                    'orders_count'       => $u->orders_count,
                    'created_at'         => $u->created_at,
                    'updated_at'         => $u->updated_at,
                    'profile' => $u->profile ? [
                        'phone'          => $u->profile->phone,
                        'gender'         => $u->profile->gender,
                        'date_of_birth'  => $u->profile->date_of_birth,
                        'address'        => $u->profile->address,
                        'payment_method' => $u->profile->payment_method,
                        'age'            => $u->profile->age,
                    ] : null,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'error' => 'User not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
