import { useState, useEffect } from "react";
import Stars from "./Stars";
import { apiFetch } from "../utils/api";
import "../styles/BookModal.css";

export default function BookModal({ book, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/books/${book.book_id}`)
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => { setDetail(book); setLoading(false); });
  }, [book]);

  const b = detail || book;
  const reviews = b.reviews || [];

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal__header">
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
            Loading…
          </div>
        ) : (
          <>
            <div className="modal__body">
              {/* Cover */}
              <div>
                {b.cover_image_url ? (
                  <div className="modal__cover">
                    <img src={b.cover_image_url} alt={b.book_name} />
                  </div>
                ) : (
                  <div className="modal__cover">{b.book_name}</div>
                )}
              </div>

              {/* Info */}
              <div>
                <div className="modal__category">{b.category?.name}</div>
                <div className="modal__title">{b.book_name}</div>
                <div className="modal__author">by {b.author?.name}</div>

                <div className="modal__meta">
                  <div>
                    <div className="modal__meta-label">Price</div>
                    <div className="modal__meta-value modal__meta-value--accent">
                      RM {parseFloat(b.price).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="modal__meta-label">Rating</div>
                    <div className="modal__meta-value">
                      {b.book_total_rating
                        ? `${parseFloat(b.book_total_rating).toFixed(1)} / 5`
                        : "No ratings"}
                    </div>
                  </div>
                  <div>
                    <div className="modal__meta-label">Stock</div>
                    <div className="modal__meta-value">
                      {b.available_quantity > 0
                        ? `${b.available_quantity} left`
                        : "Out of stock"}
                    </div>
                  </div>
                </div>

                {b.book_description && (
                  <p className="modal__desc">{b.book_description}</p>
                )}

                <div className="modal__actions">
                  <button
                    className="btn-primary"
                    disabled={b.available_quantity === 0}
                  >
                    {b.available_quantity === 0 ? "Out of Stock" : "Add to Cart"}
                  </button>
                  <button className="btn-secondary">♡ Wishlist</button>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="modal__reviews">
              <div className="modal__reviews-title">Reader Reviews</div>
              {reviews.length === 0 ? (
                <div className="review-card__empty">No reviews yet.</div>
              ) : (
                reviews.slice(0, 5).map((r, i) => (
                  <div className="review-card" key={i}>
                    <div className="review-card__header">
                      <span className="review-card__name">
                        {r.user?.username || "Anonymous"}
                      </span>
                      <Stars rating={r.score} count={0} />
                      <span className="review-card__date">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    {r.comment && (
                      <div className="review-card__text">{r.comment}</div>
                    )}
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