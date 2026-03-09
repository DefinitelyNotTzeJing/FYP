import { useState } from "react";
import Stars from "../stars/Stars";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export default function ReviewsTab({ reviews, loading, onRefresh }) {
  const { token } = useAuth();
  const [search, setSearch]       = useState("");
  const [editing, setEditing]     = useState(null); // review_id being edited
  const [editForm, setEditForm]   = useState({ score: 5, comment: "" });
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState(null);

  if (loading) return <div className="profile-loading">Loading reviews…</div>;

  if (!reviews || reviews.length === 0) {
    return (
      <div className="orders-empty">
        <div className="orders-empty__title">No reviews yet</div>
        <div>Books you've reviewed will appear here.</div>
      </div>
    );
  }

  const filtered = reviews.filter((r) => {
    const bookName = r.book?.book_name?.toLowerCase() || "";
    const author   = r.book?.author?.name?.toLowerCase() || "";
    const q        = search.toLowerCase();
    return bookName.includes(q) || author.includes(q);
  });

  function startEdit(r) {
    setEditing(r.review_id);
    setEditForm({ score: r.score, comment: r.comment || "" });
    setSaveMsg(null);
  }

  function cancelEdit() {
    setEditing(null);
    setSaveMsg(null);
  }

  async function submitEdit(bookId) {
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiFetch(`/book-reviews/${bookId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score: editForm.score, comment: editForm.comment }),
      });
      setSaveMsg({ ok: true, text: "Review updated!" });
      setEditing(null);
      onRefresh?.();
    } catch (e) {
      setSaveMsg({ ok: false, text: e?.response?.message || "Failed to update review." });
    }
    setSaving(false);
  }

  return (
    <div>
      {/* Search bar */}
      <div style={{ marginBottom: "1.25rem", position: "relative" }}>
        <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "1rem", pointerEvents: "none" }}>⌕</span>
        <input
          type="text"
          placeholder="Search by book title or author…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "0.6rem 0.75rem 0.6rem 2.2rem",
            border: "1.5px solid var(--border)", borderRadius: "8px",
            fontFamily: "var(--font-body)", fontSize: "0.88rem",
            background: "var(--white)", color: "var(--ink)",
            boxSizing: "border-box",
          }}
        />
      </div>

      {saveMsg && (
        <div style={{ fontSize: "0.82rem", color: saveMsg.ok ? "#166534" : "#c0392b", background: saveMsg.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${saveMsg.ok ? "#bbf7d0" : "#fecaca"}`, padding: "0.5rem 0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>
          {saveMsg.text}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>No reviews match your search.</div>
      ) : (
        <div className="reviews-list">
          {filtered.map((r) => {
            const book = r.book || {};
            const isEditing = editing === r.review_id;

            return (
              <div className="review-item" key={r.review_id}>
                {/* Book info */}
                <div className="review-item__book">
                  <div className="review-item__cover">
                    {book.cover_image_url
                      ? <img src={book.cover_image_url} alt={book.book_name} />
                      : <span>{book.book_name?.slice(0, 2)}</span>
                    }
                  </div>
                  <div>
                    <div className="review-item__title">{book.book_name || "Unknown Book"}</div>
                    <div className="review-item__author">{book.author?.name}</div>
                  </div>
                </div>

                {/* Review body */}
                {isEditing ? (
                  <div className="review-item__edit">
                    {/* Star picker */}
                    <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.6rem" }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => setEditForm({ ...editForm, score: s })}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: s <= editForm.score ? "#f59e0b" : "#d1d5db", padding: 0 }}
                        >
                          ★
                        </button>
                      ))}
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", color: "var(--muted)", alignSelf: "center" }}>{editForm.score}/5</span>
                    </div>
                    <textarea
                      value={editForm.comment}
                      onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                      rows={3}
                      placeholder="Write your review…"
                      style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1.5px solid var(--border)", borderRadius: "8px", fontFamily: "var(--font-body)", fontSize: "0.88rem", resize: "vertical", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
                      <button
                        onClick={() => submitEdit(r.book?.book_id || r.book_id)}
                        disabled={saving}
                        style={{ padding: "0.45rem 1rem", background: "var(--accent)", color: "white", border: "none", borderRadius: "6px", fontFamily: "var(--font-body)", fontSize: "0.85rem", cursor: saving ? "not-allowed" : "pointer" }}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ padding: "0.45rem 1rem", background: "none", border: "1.5px solid var(--border)", borderRadius: "6px", fontFamily: "var(--font-body)", fontSize: "0.85rem", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="review-item__body">
                    <div className="review-item__meta">
                      <Stars rating={r.score} count={0} />
                      <span className="review-item__score">{r.score}/5</span>
                      <span className="review-item__date">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("en-MY", {
                          day: "numeric", month: "short", year: "numeric",
                        }) : ""}
                      </span>
                      <button
                        onClick={() => startEdit(r)}
                        style={{ marginLeft: "auto", background: "none", border: "1.5px solid var(--border)", borderRadius: "6px", padding: "0.2rem 0.65rem", fontSize: "0.78rem", cursor: "pointer", color: "var(--muted)" }}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                    {r.comment && <p className="review-item__comment">{r.comment}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}