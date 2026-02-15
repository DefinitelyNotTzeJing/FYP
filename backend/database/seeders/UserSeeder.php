<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Create Admin User
        $admin = User::create([
            'email' => 'admin@bookstore.com',
            'password' => Hash::make('password'),
            'is_admin' => true,
        ]);

        UserProfile::create([
            'user_id' => $admin->user_id,
            'username' => 'admin',
            'date_of_birth' => '1990-01-01',
            'gender' => 'M',
            'age' => 34,
            'phone' => '0123456789',
            'address' => '123 Admin Street, Kuala Lumpur',
        ]);

        // Create Regular Users
        $users = [
            [
                'email' => 'john@example.com',
                'username' => 'john_doe',
                'date_of_birth' => '1995-05-15',
                'gender' => 'M',
                'age' => 29,
            ],
            [
                'email' => 'jane@example.com',
                'username' => 'jane_smith',
                'date_of_birth' => '1998-08-20',
                'gender' => 'F',
                'age' => 26,
            ],
            [
                'email' => 'alex@example.com',
                'username' => 'alex_wong',
                'date_of_birth' => '1992-12-10',
                'gender' => 'M',
                'age' => 32,
            ],
        ];

        foreach ($users as $userData) {
            $user = User::create([
                'email' => $userData['email'],
                'password' => Hash::make('password'),
                'is_admin' => false,
            ]);

            UserProfile::create([
                'user_id' => $user->user_id,
                'username' => $userData['username'],
                'date_of_birth' => $userData['date_of_birth'],
                'gender' => $userData['gender'],
                'age' => $userData['age'],
                'phone' => '012345' . rand(1000, 9999),
                'address' => rand(1, 999) . ' Street, Shah Alam',
            ]);
        }
    }
}