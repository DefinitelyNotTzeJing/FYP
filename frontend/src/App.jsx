import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Layout
import Navbar from './components/layout/Navbar';
// import Footer from './components/layout/Footer';

// Pages
import Home from './pages/Home';
// import BookList from './pages/BookList';
// import BookDetail from './pages/BookDetail';
// import Cart from './pages/Cart';
// import Checkout from './pages/Checkout';
// import Login from './pages/Login';
// import Register from './pages/Register';
// import Profile from './pages/Profile';
// import OrderHistory from './pages/OrderHistory';

// Admin Pages
// import AdminDashboard from './pages/admin/Dashboard';
// import AdminBooks from './pages/admin/Books';
// import AdminOrders from './pages/admin/Orders';

// Protected Route
import ProtectedRoute from './routes/ProtectedRoute';

import './styles/Globals.css';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app">
            <Navbar />
            <main className="main-content">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                {/* <Route path="/books" element={<BookList />} />
                <Route path="/books/:id" element={<BookDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} /> */}

                {/* Protected Routes */}
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      {/* <Checkout /> */}
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      {/* <Profile /> */}
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      {/* <OrderHistory /> */}
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      {/* <AdminDashboard /> */}
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/books"
                  element={
                    <ProtectedRoute adminOnly>
                      {/* <AdminBooks /> */}
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/orders"
                  element={
                    <ProtectedRoute adminOnly>
                      {/* <AdminOrders /> */}
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
            {/* <Footer /> */}
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;