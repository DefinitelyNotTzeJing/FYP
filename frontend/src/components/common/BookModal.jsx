import { useState, useEffect } from "react";
import Stars from "../stars/Stars";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import "../../styles/BookModal.css";

export default function BookModal({ book, onClose, onRequireAuth, wishlistHook, cartHook, initialInWishlist = false }) {
  const { token } = useAuth();
  const [detail, setDetail]                   = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [inWishlist, setInWishlist]           = useState(initialInWishlist);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [cartLoading, setCartLoading]         = useState(false);
  const [cartMsg, setCartMsg]                 = useState(null);

  useEffect(() => {
    apiFetch(`/books/${book.book_id}`)
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => { setDetail(book); setLoading(false); });
  }, [book]);

  // Only check wishlist status if not already known (i.e. not opened from wishlist page)
  useEffect(() => {
    if (!token || !wishlistHook || initialInWishlist) return;
    wishlistHook.check(book.book_id).then(setInWishlist);
  }, [book.book_id, token, wishlistHook, initialInWishlist]);

  const b = detail || book;
  const reviews = b.reviews || [];

  async function handleWishlist() {
    if (!token) { onRequireAuth?.(); return; }
    setWishlistLoading(true);
    try {
      if (inWishlist) {
        await wishlistHook.remove(book.book_id);
        setInWishlist(false);
      } else {
        await wishlistHook.add(book.book_id);
        setInWishlist(true);
      }
    } catch (e) { console.error("Wishlist error:", e?.response || e); }
    setWishlistLoading(false);
  }

  async function handleAddToCart() {
    if (!token) { onRequireAuth?.(); return; }
    setCartLoading(true);
    setCartMsg(null);
    try {
      await cartHook.add(book.book_id, 1);
      setCartMsg({ ok: true, text: "Added to cart!" });
      setTimeout(() => setCartMsg(null), 2500);
    } catch (e) {
      console.error("Cart error:", e?.response || e);
      setCartMsg({ ok: false, text: e?.response?.message || "Failed to add to cart." });
    }
    setCartLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div>
        ) : (
          <>
            <div className="modal__body">
              <div>
                {b.cover_image_url
                  ? <div className="modal__cover"><img src={b.cover_image_url} alt={b.book_name} /></div>
                  : <div className="modal__cover">{b.book_name}</div>
                }
              </div>
              <div>
                <div className="modal__category">{b.category?.name}</div>
                <div className="modal__title">{b.book_name}</div>
                <div className="modal__author">by {b.author?.name}</div>
                <div className="modal__meta">
                  <div>
                    <div className="modal__meta-label">Price</div>
                    <div className="modal__meta-value modal__meta-value--accent">RM {parseFloat(b.price).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="modal__meta-label">Rating</div>
                    <div className="modal__meta-value">{b.book_total_rating ? `${parseFloat(b.book_total_rating).toFixed(1)} / 5` : "No ratings"}</div>
                  </div>
                  <div>
                    <div className="modal__meta-label">Stock</div>
                    <div className="modal__meta-value">{b.available_quantity > 0 ? `${b.available_quantity} left` : "Out of stock"}</div>
                  </div>
                </div>
                {b.book_description && <p className="modal__desc">{b.book_description}</p>}
                {cartMsg && (
                  <div style={{ fontSize: "0.82rem", color: cartMsg.ok ? "#166534" : "#c0392b", background: cartMsg.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${cartMsg.ok ? "#bbf7d0" : "#fecaca"}`, padding: "0.5rem 0.75rem", borderRadius: "6px", marginBottom: "0.75rem" }}>
                    {cartMsg.text}
                  </div>
                )}
                <div className="modal__actions">
                  <button className="btn-primary" disabled={b.available_quantity === 0 || cartLoading} onClick={handleAddToCart}>
                    {cartLoading ? "Adding…" : b.available_quantity === 0 ? "Out of Stock" : "Add to Cart"}
                  </button>
                  <button className="btn-secondary" onClick={handleWishlist} disabled={wishlistLoading} style={inWishlist ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}}>
                    {wishlistLoading ? "…" : inWishlist ? "♥ Wishlisted" : "♡ Wishlist"}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal__reviews">
              <div className="modal__reviews-title">Reader Reviews</div>
              {reviews.length === 0 ? (
                <div className="review-card__empty">No reviews yet.</div>
              ) : (
                reviews.slice(0, 5).map((r, i) => (
                  <div className="review-card" key={i}>
                    <div className="review-card__header">
                      <span className="review-card__name">{r.user?.username || "Anonymous"}</span>
                      <Stars rating={r.score} count={0} />
                      <span className="review-card__date">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</span>
                    </div>
                    {r.comment && <div className="review-card__text">{r.comment}</div>}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}