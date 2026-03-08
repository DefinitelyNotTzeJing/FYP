import { useState, useEffect } from "react";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

function statusColor(status) {
  return {
    pending:    { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
    processing: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
    shipped:    { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
    delivered:  { bg: "#f0fdf4", color: "#14532d", border: "#4ade80" },
    cancelled:  { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
  }[status] || { bg: "var(--paper)", color: "var(--muted)", border: "var(--border)" };
}

// ── Star picker ────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: "0.2rem" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "1.4rem", padding: "0 1px",
            color: s <= (hover || value) ? "#f59e0b" : "#d1d5db",
            transition: "color 0.1s",
          }}
        >★</button>
      ))}
      <span style={{ alignSelf: "center", fontSize: "0.82rem", color: "var(--muted)", marginLeft: "0.35rem" }}>
        {value}/5
      </span>
    </div>
  );
}

// ── Review form for a single book ──────────────────────────────────────────
function BookReviewForm({ bookId, bookName, token, onDone }) {
  const [score, setScore]       = useState(5);
  const [comment, setComment]   = useState("");
  const [existing, setExisting] = useState(null); // null = loading, false = none
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  // Load existing review
  useEffect(() => {
    apiFetch(`/books/${bookId}/my-review`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((d) => {
        if (d.has_rated && d.data) {
          setExisting(d.data);
          setScore(d.data.score);
          setComment(d.data.comment || "");
        } else {
          setExisting(false);
        }
      })
      .catch(() => setExisting(false));
  }, [bookId, token]);

  async function submit() {
    setSaving(true);
    setMsg(null);
    try {
      if (existing) {
        await apiFetch(`/book-reviews/${bookId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ score, comment }),
        });
        setMsg({ ok: true, text: "Review updated!" });
      } else {
        await apiFetch("/book-reviews", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ book_id: bookId, score, comment }),
        });
        setMsg({ ok: true, text: "Review submitted!" });
        setExisting({ score, comment });
      }
      onDone?.();
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.error || e?.response?.message || "Failed to save review." });
    }
    setSaving(false);
  }

  if (existing === null) {
    return <div style={{ fontSize: "0.8rem", color: "var(--muted)", padding: "0.5rem 0" }}>Loading…</div>;
  }

  return (
    <div style={{ marginTop: "0.6rem", padding: "0.85rem 1rem", background: "var(--paper)", borderRadius: "8px", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.5rem" }}>
        {existing ? "✏️ Edit your review" : "⭐ Rate this book"}
      </div>

      <StarPicker value={score} onChange={setScore} />

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Write a comment (optional)…"
        style={{
          width: "100%", marginTop: "0.5rem", padding: "0.5rem 0.7rem",
          border: "1.5px solid var(--border)", borderRadius: "6px",
          fontFamily: "var(--font-body)", fontSize: "0.83rem",
          resize: "vertical", boxSizing: "border-box",
          background: "var(--white)", color: "var(--ink)",
        }}
      />

      {msg && (
        <div style={{
          fontSize: "0.78rem", marginTop: "0.4rem", padding: "0.35rem 0.65rem",
          borderRadius: "5px",
          color: msg.ok ? "#166534" : "#991b1b",
          background: msg.ok ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${msg.ok ? "#bbf7d0" : "#fecaca"}`,
        }}>
          {msg.text}
        </div>
      )}

      <button
        onClick={submit}
        disabled={saving}
        style={{
          marginTop: "0.6rem", padding: "0.4rem 1rem",
          background: "var(--ink)", color: "white", border: "none",
          borderRadius: "6px", fontFamily: "var(--font-body)",
          fontSize: "0.82rem", cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving…" : existing ? "Update Review" : "Submit Review"}
      </button>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────
export default function OrderDetailModal({ order, onClose }) {
  const { token } = useAuth();
  const [detail, setDetail]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [openReview, setOpenReview] = useState(null); // book_id

  useEffect(() => {
    apiFetch(`/orders/${order.order_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => { setDetail(order); setLoading(false); });
  }, [order.order_id, token]); // eslint-disable-line

  const o = detail || order;
  const sc = statusColor(o.status);
  const canReview = ["delivered", "processing"].includes(o.status);

  // Derive pricing breakdown
  const itemsSubtotal = o.items?.reduce((s, i) => s + parseFloat(i.total || 0), 0) || 0;
  const total = parseFloat(o.total_amount || 0);
  // If total > itemsSubtotal it means tax+shipping were added at checkout
  const hasTaxShipping = total > itemsSubtotal + 0.01;
  const shipping = hasTaxShipping ? 5.00 : 0;
  const tax = hasTaxShipping ? parseFloat(((total - itemsSubtotal - 5) ).toFixed(2)) : 0;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "var(--white)", borderRadius: "14px",
        width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        animation: "slideUp 0.2s ease",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: "1.25rem 1.5rem 1rem",
          borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>
              #{o.order_number}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>
              {o.created_at ? new Date(o.created_at).toLocaleDateString("en-MY", {
                day: "numeric", month: "long", year: "numeric",
              }) : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{
              padding: "0.3rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem",
              fontWeight: 600, border: `1px solid ${sc.border}`,
              background: sc.bg, color: sc.color, textTransform: "capitalize",
            }}>
              {o.status}
            </span>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "var(--muted)", lineHeight: 1 }}
            >✕</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div>
        ) : (
          <div style={{ padding: "1.25rem 1.5rem" }}>

            {/* Order items */}
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
              Items
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {o.items?.map((item) => {
                const book = item.book || {};
                const isOpen = openReview === book.book_id;
                return (
                  <div key={item.order_item_id} style={{
                    border: "1px solid var(--border)", borderRadius: "10px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      display: "grid", gridTemplateColumns: "52px 1fr auto",
                      gap: "0.75rem", alignItems: "center",
                      padding: "0.85rem 1rem",
                    }}>
                      {/* Cover */}
                      <div style={{
                        width: 52, height: 70, borderRadius: "4px", overflow: "hidden",
                        background: "var(--paper-dark)", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: "0.65rem", color: "var(--muted)", flexShrink: 0,
                      }}>
                        {book.cover_image_url
                          ? <img src={book.cover_image_url} alt={book.book_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : book.book_name?.slice(0, 2)
                        }
                      </div>

                      {/* Info */}
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.88rem" }}>
                          {book.book_name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                          {book.author?.name}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                          Qty: {item.quantity} × RM {parseFloat(item.price).toFixed(2)}
                        </div>
                      </div>

                      {/* Right: total + review btn */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--accent)" }}>
                          RM {parseFloat(item.total).toFixed(2)}
                        </span>
                        {canReview && (
                          <button
                            onClick={() => setOpenReview(isOpen ? null : book.book_id)}
                            style={{
                              fontSize: "0.72rem", padding: "0.2rem 0.6rem",
                              border: `1.5px solid ${isOpen ? "var(--ink)" : "var(--border)"}`,
                              borderRadius: "5px", background: isOpen ? "var(--ink)" : "none",
                              color: isOpen ? "white" : "var(--muted)",
                              cursor: "pointer", whiteSpace: "nowrap",
                              transition: "all 0.15s",
                            }}
                          >
                            {isOpen ? "✕ Close" : "⭐ Review"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline review form */}
                    {isOpen && (
                      <div style={{ borderTop: "1px solid var(--border)", padding: "0 1rem 1rem" }}>
                        <BookReviewForm
                          bookId={book.book_id}
                          bookName={book.book_name}
                          token={token}
                          onDone={() => {}}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Order info */}
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
              Details
            </div>
            <div style={{ background: "var(--paper)", borderRadius: "10px", padding: "1rem 1.1rem", marginBottom: "1rem" }}>
              {[
                ["Payment",  o.payment_method],
                ["Shipping", o.shipping_address],
                ["Verified", o.verified_by_face ? "🫤 Face Recognition" : "🔑 Password"],
              ].map(([label, val]) => val && (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: "0.45rem", gap: "1rem" }}>
                  <span style={{ color: "var(--muted)", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontWeight: 500, textAlign: "right" }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div style={{ background: "var(--paper)", borderRadius: "10px", padding: "1rem 1.1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
                <span>Subtotal</span>
                <span>RM {itemsSubtotal.toFixed(2)}</span>
              </div>
              {hasTaxShipping && (<>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
                  <span>Shipping</span><span>RM {shipping.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
                  <span>Tax (6%)</span><span>RM {tax.toFixed(2)}</span>
                </div>
              </>)}
              <div style={{ height: 1, background: "var(--border)", margin: "0.6rem 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem" }}>
                <span>Total</span>
                <span style={{ color: "var(--accent)" }}>RM {total.toFixed(2)}</span>
              </div>
            </div>

            {canReview && (
              <div style={{ marginTop: "1rem", fontSize: "0.78rem", color: "var(--muted)", textAlign: "center" }}>
                Tap <strong>⭐ Review</strong> on any book above to rate it.
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}