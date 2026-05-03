<div align="center">

# 📚 BookFace — AI-Powered Bookstore

**A full-stack e-commerce bookstore with facial recognition authentication & biometric payment verification**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Netlify-00C7B7?style=for-the-badge)](https://ctj-fyp-webapp.netlify.app/)
[![Laravel](https://img.shields.io/badge/Laravel-12.0-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-InsightFace-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://github.com/deepinsight/insightface)

</div>

---

## 🔥 What Makes This Different

Most bookstores let you pay with a card. This one lets you pay **with your face**.

BookFace integrates deep-learning facial recognition into a full e-commerce flow — register your face once, and use it as a second-factor for login and payment verification. No tokens. No OTP SMS. Just look at the camera.

---

## ✨ Feature Highlights

| Feature | Description |
|---|---|
| 👤 **Face Login** | Log in with a glance using InsightFace 512-dim embeddings |
| 💳 **Biometric Payment** | Confirm purchases via face verification (liveness-protected) |
| 🛡️ **Anti-Spoofing** | Liveness detection rejects photos and replays |
| 🔐 **Encrypted Biometrics** | Face embeddings encrypted at rest in the database |
| 📱 **PWA Support** | Installable mobile app with offline caching |
| 🛒 **Full Shopping Flow** | Cart → Checkout → Payment → Order tracking |
| ❤️ **Wishlist** | Save books for later |
| ⭐ **Reviews & Ratings** | Community-driven book ratings |
| 📦 **Pre-orders** | Reserve upcoming titles before release |
| 🔑 **OTP Password Reset** | Secure email-based account recovery |
| 🛠️ **Admin Panel** | Full CRUD for books, authors, categories, orders, and users |

---

## 🏗️ Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│   React 19 · React Router 7 · Lucide Icons · Workbox PWA        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API (JSON + Bearer Token)
┌───────────────────────────▼─────────────────────────────────────┐
│                       Backend (Laravel)                          │
│   Laravel 12 · Sanctum Auth · PHPUnit · MySQL / SQLite           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (Base64 frames)
┌───────────────────────────▼─────────────────────────────────────┐
│                   Face Service (Python + Flask)                  │
│   InsightFace · OpenCV · NumPy · Liveness Detection              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- PHP 8.2+, Composer
- Node.js 18+, npm
- Python 3.9+
- MySQL (or use SQLite for local dev)
- [Ngrok](https://ngrok.com/) (optional, for exposing local backend)

---

### 1 · Clone & Install

```bash
git clone <repo-url>
cd FYP
```

**Backend**
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
```

**Frontend**
```bash
cd frontend
npm install
```

**Face Recognition Service**
```bash
cd backend/face/insightface
pip install -r requirements.txt
```

---

### 2 · Run All Services

Open three terminals:

```bash
# Terminal 1 — Laravel API
cd backend
php artisan serve --host=0.0.0.0 --port=8000

# Terminal 2 — Python Face API
cd backend/face/insightface
python face_recognition_api.py

# Terminal 3 — React Dev Server
cd frontend
npm start
```

App runs at **http://localhost:3000**

---

### 3 · Seed the Database

```bash
cd backend
php artisan migrate:fresh --seed
```

Default admin account:
| Field | Value |
|---|---|
| Email | `admin@bookstore.com` |
| Password | `password` |

---

## 🧠 How Face Recognition Works

```
User opens webcam
      │
      ▼
Frontend captures frames
      │
      ▼ Base64 POST /api/face/register
Backend (Laravel)
      │
      ▼ HTTP → localhost:5000
Python Flask + InsightFace
      │  · Detects face
      │  · Checks liveness (anti-spoof)
      │  · Extracts 512-dim embedding
      ▼
Embedding encrypted → stored in DB
      │
      ▼ At checkout:
Real-time webcam frame compared
against stored embedding (cosine similarity)
      │
      ▼
✅ Match → payment authorized
❌ No match → payment blocked
```

---

## 🗄️ Database Overview

15 tables powering the full application:

```
users ──────── user_profiles
  │
  ├─── carts ────── books ──── authors
  │                   │
  ├─── wishlists      ├──── categories
  │                   │
  ├─── orders         ├──── ratings
  │     └── order_items    └── reviews
  │
  └─── preorders
```

The `users.face_embedding` column stores an **encrypted 512-float array** — no raw biometric data ever persists in plaintext.

---

## 🧪 Running Tests

```bash
# Laravel (PHPUnit)
cd backend
php artisan test

# Python Face Service (pytest)
cd backend/face/insightface
pytest tests/test_face_service.py -v

# React (Jest)
cd frontend
npm test
```

---

## 📡 API Reference (selected endpoints)

<details>
<summary><b>Authentication</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | Create account |
| POST | `/api/login` | Password login |
| POST | `/api/logout` | Revoke token |
| POST | `/api/password/forgot` | Request OTP |
| POST | `/api/password/reset` | Reset with OTP |

</details>

<details>
<summary><b>Face Recognition</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/face/register` | Enroll face (authenticated) |
| POST | `/api/face/verify` | 1:1 face verification |
| POST | `/api/face/check-pose` | Validate pose before enrollment |
| DELETE | `/api/face/remove` | Remove stored embedding |
| GET | `/api/face/status` | Check enrollment status |

</details>

<details>
<summary><b>Shopping & Payments</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/cart` | View / add to cart |
| DELETE | `/api/cart/{bookId}` | Remove from cart |
| POST | `/api/orders` | Place order |
| POST | `/api/payment/verify-password` | Authorize via password |
| POST | `/api/payment/verify-face` | Authorize via face scan |

</details>

---

## 🌐 Deployment

**Frontend** is deployed to Netlify via `npm run build`.

**Backend** requires a PHP 8.2+ host with:
- MySQL database
- Laravel queue worker (optional)
- Python face service running on a reachable port

For local-to-production tunneling during development, Ngrok is used to expose the Laravel server:

```bash
ngrok start laravel --config ngrok.yml
```

---

## 📁 Project Structure

```
FYP/
├── backend/                  # Laravel 12 API
│   ├── app/Http/Controllers/Api/   # 14 API controllers
│   ├── app/Models/                 # 12 Eloquent models
│   ├── database/migrations/        # 18 migration files
│   ├── routes/api.php              # 70+ API routes
│   └── face/insightface/           # Python face service
│       ├── face_recognition_api.py # Flask API
│       └── face_liveness_service.py
│
├── frontend/                 # React 19 SPA
│   └── src/
│       ├── pages/            # HomePage, Auth, Cart, Checkout, Admin…
│       ├── components/       # BookCard, FaceLoginForm, PWABanner…
│       ├── context/          # AuthContext
│       └── hooks/            # useBooks, useProfile, usePreorders
│
└── diagram/                  # ERD, DFD, Use Case, Architecture docs
```

---

<div align="center">

Built as a Final Year Project · Laravel + React + InsightFace

</div>
