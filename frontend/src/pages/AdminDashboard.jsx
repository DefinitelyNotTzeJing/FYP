import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookService } from '../api/BookService';
import { orderService } from '../api/OrderService';
import './AdminPages.css';

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    failedPayments: 0,
    totalBooks: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const [recent, pending, failed, books] = await Promise.all([
          orderService.getAllOrders(),
          orderService.getAllOrders({ status: 'pending' }),
          orderService.getAllOrders({ payment_status: 'failed' }),
          bookService.getBooks({ limit: 1 }),
        ]);

        setRecentOrders((recent.items || []).slice(0, 6));
        setStats({
          totalOrders: recent.meta?.total || 0,
          pendingOrders: pending.meta?.total || 0,
          failedPayments: failed.meta?.total || 0,
          totalBooks: books.meta?.total || 0,
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load the admin dashboard.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div className="container">
          <p className="admin-eyebrow">Admin Control</p>
          <h1>Bookstore operations dashboard</h1>
          <p className="admin-subtitle">
            Track orders, review failed payments, and jump into the catalog overview.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="container">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : (
            <>
              <div className="admin-stat-grid">
                <div className="admin-stat-card">
                  <span>Total Orders</span>
                  <strong>{stats.totalOrders}</strong>
                </div>
                <div className="admin-stat-card">
                  <span>Pending Orders</span>
                  <strong>{stats.pendingOrders}</strong>
                </div>
                <div className="admin-stat-card">
                  <span>Failed Payments</span>
                  <strong>{stats.failedPayments}</strong>
                </div>
                <div className="admin-stat-card">
                  <span>Catalog Books</span>
                  <strong>{stats.totalBooks}</strong>
                </div>
              </div>

              <div className="admin-actions-row">
                <Link to="/admin/orders" className="btn btn-primary btn-sm">
                  Manage Orders
                </Link>
                <Link to="/admin/books" className="btn btn-outline btn-sm">
                  Review Catalog
                </Link>
              </div>

              <div className="card admin-card">
                <div className="admin-card-header">
                  <div>
                    <h2>Recent Orders</h2>
                    <p>Latest orders from the system.</p>
                  </div>
                  <Link to="/admin/orders" className="admin-inline-link">
                    View all
                  </Link>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.orderNumber}</td>
                          <td>
                            <div className="admin-customer-cell">
                              <span>{order.user?.displayName || order.user?.username || 'Customer'}</span>
                              <small>{order.user?.email || 'No email'}</small>
                            </div>
                          </td>
                          <td>
                            <span className={`admin-pill admin-pill-${order.status}`}>{order.status}</span>
                          </td>
                          <td>
                            <span className={`admin-pill admin-pill-${order.paymentStatus}`}>
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td>{formatMoney(order.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
