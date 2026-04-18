import React, { useEffect, useState } from 'react';
import { orderService } from '../api/OrderService';
import './AdminPages.css';

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

const defaultDraft = (order) => ({
  status: order.status,
  payment_status: order.paymentStatus,
});

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    payment_status: '',
  });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await orderService.getAllOrders(filters);
        setOrders(response.items || []);
        setDrafts(
          Object.fromEntries((response.items || []).map((order) => [order.id, defaultDraft(order)]))
        );
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load admin orders.');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleDraftChange = (orderId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...current[orderId],
        [field]: value,
      },
    }));
  };

  const handleUpdate = async (orderId) => {
    setSavingId(orderId);
    setError('');
    setNotice('');

    try {
      const result = await orderService.updateOrderStatus(orderId, drafts[orderId]);
      const existingOrder = orders.find((order) => order.id === orderId);
      const updatedOrder = {
        ...result.order,
        user: result.order?.user || existingOrder?.user || null,
      };

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updatedOrder : order))
      );
      setDrafts((current) => ({
        ...current,
        [orderId]: defaultDraft(updatedOrder),
      }));
      setNotice(`Updated ${updatedOrder.orderNumber} successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update order status.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="admin-page">
      <section className="admin-hero admin-hero-compact">
        <div className="container">
          <p className="admin-eyebrow">Admin Orders</p>
          <h1>Review and update order status</h1>
        </div>
      </section>

      <section className="admin-section">
        <div className="container">
          <div className="card admin-card admin-filter-card">
            <div className="admin-filter-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="status">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  className="form-select"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="payment_status">
                  Payment
                </label>
                <select
                  id="payment_status"
                  name="payment_status"
                  className="form-select"
                  value={filters.payment_status}
                  onChange={handleFilterChange}
                >
                  <option value="">All payment states</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          {notice ? <div className="alert alert-success">{notice}</div> : null}
          {error ? <div className="alert alert-error">{error}</div> : null}

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="admin-order-list">
              {orders.map((order) => (
                <article key={order.id} className="card admin-order-card">
                  <div className="admin-order-top">
                    <div>
                      <p className="admin-order-number">{order.orderNumber}</p>
                      <h2>{order.user?.displayName || order.user?.username || 'Customer'}</h2>
                      <p className="admin-order-email">{order.user?.email}</p>
                    </div>
                    <div className="admin-order-total">{formatMoney(order.totalAmount)}</div>
                  </div>

                  <div className="admin-order-meta">
                    <div>
                      <span className="order-meta-label">Shipping</span>
                      <p>{order.shippingAddress || 'No shipping address'}</p>
                    </div>
                    <div>
                      <span className="order-meta-label">Items</span>
                      <p>{order.items.length} books</p>
                    </div>
                    <div>
                      <span className="order-meta-label">Payment Method</span>
                      <p>{order.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="admin-order-actions">
                    <div className="form-group">
                      <label className="form-label" htmlFor={`status-${order.id}`}>
                        Order Status
                      </label>
                      <select
                        id={`status-${order.id}`}
                        className="form-select"
                        value={drafts[order.id]?.status || order.status}
                        onChange={(event) => handleDraftChange(order.id, 'status', event.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor={`payment-${order.id}`}>
                        Payment Status
                      </label>
                      <select
                        id={`payment-${order.id}`}
                        className="form-select"
                        value={drafts[order.id]?.payment_status || order.paymentStatus}
                        onChange={(event) =>
                          handleDraftChange(order.id, 'payment_status', event.target.value)
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm admin-save-btn"
                      onClick={() => handleUpdate(order.id)}
                      disabled={savingId === order.id}
                    >
                      {savingId === order.id ? 'Saving...' : 'Save Changes'}
                    </button>
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

export default AdminOrders;
