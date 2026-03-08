import { useState } from "react";
import OrderDetailModal from "./OrderDetailModal";

function statusClass(status) {
  const map = {
    pending:    "order-status--pending",
    processing: "order-status--processing",
    shipped:    "order-status--shipped",
    delivered:  "order-status--delivered",
    cancelled:  "order-status--cancelled",
  };
  return `order-status ${map[status] || "order-status--pending"}`;
}

export default function OrdersTab({ orders, loading }) {
  const [selected, setSelected] = useState(null);

  if (loading) {
    return <div className="profile-loading">Loading orders…</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="orders-empty">
        <div className="orders-empty__title">No orders yet</div>
        <div>Your completed orders will appear here.</div>
      </div>
    );
  }

  return (
    <>
      <div className="orders-list">
        {orders.map((order) => {
          const itemCount   = order.items?.length || 0;
          const itemSummary = order.items
            ?.slice(0, 2)
            .map((i) => i.book?.book_name)
            .filter(Boolean)
            .join(", ");
          const extra = itemCount > 2 ? ` +${itemCount - 2} more` : "";

          return (
            <div
              className="order-card"
              key={order.order_id}
              onClick={() => setSelected(order)}
              style={{ cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}
            >
              <div className="order-card__header">
                <div>
                  <div className="order-card__number">#{order.order_number}</div>
                  <div className="order-card__date">
                    {new Date(order.created_at).toLocaleDateString("en-MY", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </div>
                </div>
                <span className={statusClass(order.status)}>
                  {order.status}
                </span>
              </div>

              {itemSummary && (
                <div className="order-card__items">
                  {itemSummary}{extra}
                </div>
              )}

              <div className="order-card__footer" style={{gap:"1rem"}}> 
                <span className="order-card__total">
                  RM {parseFloat(order.total_amount).toFixed(2)}
                </span>
                <span className="order-card__method">{order.payment_method}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--muted)" }}>
                  View details →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}