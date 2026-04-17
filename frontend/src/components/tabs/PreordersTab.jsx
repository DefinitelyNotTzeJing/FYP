import { X } from "lucide-react";

function statusClass(status) {
  const map = {
    pending:   "preorder-status--pending",
    cancelled: "preorder-status--cancelled",
    fulfilled: "preorder-status--fulfilled",
  };
  return `preorder-status ${map[status] || "preorder-status--pending"}`;
}

export default function PreordersTab({ preorders, loading, onCancel }) {
  if (loading) {
    return <div className="profile-loading">Loading pre-orders…</div>;
  }

  if (!preorders || preorders.length === 0) {
    return (
      <div className="orders-empty">
        <div className="orders-empty__title">No pre-orders yet</div>
        <div>When a book you want is out of stock, you can pre-order it here.</div>
      </div>
    );
  }

  return (
    <div className="orders-list">
      {preorders.map((p) => {
        const book = p.book;
        return (
          <div className="order-card" key={p.preorder_id}>
            <div className="order-card__header">
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flex: 1 }}>
                {book?.cover_image_url && (
                  <img
                    src={book.cover_image_url}
                    alt={book.book_name}
                    style={{ width: 44, height: 60, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="order-card__number" style={{ fontSize: "0.92rem" }}>
                    {book?.book_name || "Unknown book"}
                  </div>
                  <div className="order-card__date" style={{ marginTop: 2 }}>
                    by {book?.author?.name || "—"}
                  </div>
                  <div className="order-card__date">
                    Placed {new Date(p.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                <span className={statusClass(p.status)}>
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
                <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--accent)" }}>
                  RM {parseFloat(p.price_at_preorder).toFixed(2)}
                </div>
              </div>
            </div>
            {p.status === "pending" && (
              <div className="order-card__footer" style={{ justifyContent: "flex-end" }}>
                <button
                  onClick={() => onCancel(p.preorder_id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.3rem",
                    padding: "0.3rem 0.75rem", borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)", background: "none",
                    fontSize: "0.78rem", color: "var(--muted)", cursor: "pointer",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
                >
                  <X size={12} /> Cancel Pre-order
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
