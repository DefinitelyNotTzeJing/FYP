import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderService } from '../api/OrderService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Checkout.css';

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, clearCart, getCartTotal } = useCart();
  const [formData, setFormData] = useState({
    shipping_address: user?.profile?.address || '',
    payment_method: user?.profile?.payment_method || 'Credit Card',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const orderItems = cart.map((item) => ({
    book_id: item.id,
    quantity: item.quantity,
  }));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await orderService.createOrder({
        items: orderItems,
        shipping_address: formData.shipping_address,
        payment_method: formData.payment_method,
        notes: formData.notes,
      });

      clearCart();
      navigate('/orders', {
        replace: true,
        state: { notice: 'Order placed successfully.' },
      });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Unable to place the order.');
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <section className="checkout-hero">
          <div className="container">
            <p className="cart-eyebrow">Checkout</p>
            <h1>Your cart is empty</h1>
            <p className="cart-subtitle">Add books first, then come back to complete the order.</p>
            <Link to="/books" className="btn btn-primary btn-sm">
              Browse Books
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <section className="checkout-hero">
        <div className="container">
          <p className="cart-eyebrow">Checkout</p>
          <h1>Confirm your order</h1>
          <p className="cart-subtitle">
            Shipping details and payment method are sent directly to the backend order API.
          </p>
        </div>
      </section>

      <section className="checkout-section">
        <div className="container checkout-layout">
          <form onSubmit={handleSubmit} className="card checkout-form-card">
            <h2>Shipping and Payment</h2>

            {error ? <div className="alert alert-error">{error}</div> : null}

            <div className="form-group">
              <label className="form-label" htmlFor="shipping_address">
                Shipping Address
              </label>
              <textarea
                id="shipping_address"
                name="shipping_address"
                className="form-textarea"
                value={formData.shipping_address}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="payment_method">
                Payment Method
              </label>
              <select
                id="payment_method"
                name="payment_method"
                className="form-select"
                value={formData.payment_method}
                onChange={handleChange}
                required
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="PayPal">PayPal</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                className="form-textarea"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Optional delivery notes"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Placing order...' : 'Place Order'}
            </button>
          </form>

          <aside className="card checkout-summary-card">
            <h2>Items in this order</h2>
            <div className="checkout-items">
              {cart.map((item) => (
                <div key={item.id} className="checkout-item-row">
                  <div>
                    <p className="checkout-item-title">{item.title}</p>
                    <p className="checkout-item-meta">x{item.quantity}</p>
                  </div>
                  <strong>{formatMoney(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>

            <div className="cart-summary-row">
              <span>Total</span>
              <strong>{formatMoney(getCartTotal())}</strong>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default Checkout;
