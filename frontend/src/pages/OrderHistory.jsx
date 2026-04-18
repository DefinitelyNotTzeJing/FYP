import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { orderService } from '../api/OrderService';
import './OrderHistory.css';

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return 'Unknown date';
  }

  return new Date(dateString).toLocaleDateString();
}

const OrderHistory = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notice = location.state?.notice || '';

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await orderService.getUserOrders();
        setOrders(response.items || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load your orders right now.');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  return (
    <div className="orders-page">
      <section className="orders-hero">
        <div className="container">
          <p className="orders-eyebrow">Orders</p>
          <h1>Your order history</h1>
          <p className="orders-subtitle">
            Review purchases, payment states, and shipment details from your account.
          </p>
        </div>
      </section>

      <section className="orders-section">
        <div className="container">
          {notice ? <div className="alert alert-success">{notice}</div> : null}

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : orders.length === 0 ? (
            <div className="card orders-empty">
              <h2>No orders yet</h2>
              <p>This account has not placed any orders. Browse the catalog to get started.</p>
              <Link to="/books" className="btn btn-primary btn-sm">
                Explore Books
              </Link>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <article key={order.id} className="card order-card">
                  <div className="order-card-header">
                    <div>
                      <p className="order-number">{order.orderNumber}</p>
                      <h2>{formatMoney(order.totalAmount)}</h2>
                    </div>
                    <div className="order-meta-badges">
                      <span className={`order-badge status-${order.status}`}>{order.status}</span>
                      <span className={`order-badge payment-${order.paymentStatus}`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="order-meta-grid">
                    <div>
                      <span className="order-meta-label">Placed</span>
                      <p>{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <span className="order-meta-label">Payment</span>
                      <p>{order.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="order-meta-label">Items</span>
                      <p>{order.items.length}</p>
                    </div>
                  </div>

                  <div className="order-items">
                    {order.items.map((item) => (
                      <div key={item.id} className="order-item-row">
                        <div>
                          <p className="order-item-title">{item.book?.title || 'Book'}</p>
                          <p className="order-item-author">{item.book?.author || 'Unknown Author'}</p>
                        </div>
                        <div className="order-item-meta">
                          <span>x{item.quantity}</span>
                          <span>{formatMoney(item.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="order-shipping-box">
                    <span className="order-meta-label">Shipping Address</span>
                    <p>{order.shippingAddress || 'No shipping address stored.'}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default OrderHistory;
