export default function WishlistTab({ items, loading, onRemove, onClear }) {
  if (loading) {
    return <div className="profile-loading">Loading wishlist…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="wishlist-empty">
        <div className="wishlist-empty__title">Your wishlist is empty</div>
        <div>Browse books and tap ♡ to save them here.</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button
          onClick={onClear}
          style={{
            background: "none",
            border: "none",
            fontSize: "0.82rem",
            color: "var(--muted)",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Clear all
        </button>
      </div>

      <div className="wishlist-grid">
        {items.map((item) => {
          const book = item.book || item;
          return (
            <div className="wishlist-card" key={item.wishlist_id || book.book_id}>
              <button
                className="wishlist-card__remove"
                onClick={() => onRemove(book.book_id)}
                title="Remove from wishlist"
              >
                ✕
              </button>

              <div className="wishlist-card__cover">
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt={book.book_name} />
                ) : (
                  book.book_name
                )}
              </div>

              <div className="wishlist-card__info">
                <div className="wishlist-card__title">{book.book_name}</div>
                <div className="wishlist-card__author">{book.author?.name}</div>
                <div className="wishlist-card__price">
                  RM {parseFloat(book.price).toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}