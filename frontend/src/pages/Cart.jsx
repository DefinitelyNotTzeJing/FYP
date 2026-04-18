import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Cart.css';

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, getCartTotal } = useCart();
  const { isAuthenticated } = useAuth();

  return (
    <div className="cart-page">
      <section className="cart-hero">
        <div className="container">
          <p className="cart-eyebrow">Shopping Cart</p>
          <h1>Review your selected books</h1>
          <p className="cart-subtitle">
            Adjust quantities, remove items, and continue to checkout when ready.
          </p>
        </div>
      </section>

      <section className="cart-section">
        <div className="container">
          {cart.length === 0 ? (
            <div className="card cart-empty">
              <h2>Your cart is empty</h2>
              <p>Add books from the catalog and they will appear here.</p>
              <Link to="/books" className="btn btn-primary btn-sm">
                Browse Books
              </Link>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-items">
                {cart.map((item) => (
                  <article key={item.id} className="card cart-item-card">
                    <div className="cart-item-cover-wrap">
                      <img src={item.imageUrl || item.fallbackImageUrl} alt={item.title} className="cart-item-cover" />
                    </div>

                    <div className="cart-item-content">
                      <div>
                        <p className="cart-item-title">{item.title}</p>
                        <p className="cart-item-author">{item.author}</p>
                      </div>

                      <div className="cart-item-controls">
                        <div className="cart-qty-control">
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            +
                          </button>
                        </div>

                        <div className="cart-item-prices">
                          <strong>{formatMoney(item.price * item.quantity)}</strong>
                          <span>{formatMoney(item.price)} each</span>
                        </div>

                        <button
                          type="button"
                          className="cart-remove-btn"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="card cart-summary-card">
                <h2>Order Summary</h2>
                <div className="cart-summary-row">
                  <span>Items</span>
                  <strong>{cart.length}</strong>
                </div>
                <div className="cart-summary-row">
                  <span>Total</span>
                  <strong>{formatMoney(getCartTotal())}</strong>
                </div>

                <div className="cart-summary-actions">
                  {isAuthenticated ? (
                    <Link to="/checkout" className="btn btn-primary">
                      Proceed to Checkout
                    </Link>
                  ) : (
                    <Link to="/login" className="btn btn-primary">
                      Login to Checkout
                    </Link>
                  )}

                  <button type="button" className="btn btn-outline" onClick={clearCart}>
                    Clear Cart
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Cart;
