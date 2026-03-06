import Stars from "../stars/Stars";

export default function ReviewsTab({ reviews, loading }) {
  if (loading) return <div className="profile-loading">Loading reviews…</div>;

  if (!reviews || reviews.length === 0) {
    return (
      <div className="orders-empty">
        <div className="orders-empty__title">No reviews yet</div>
        <div>Books you've reviewed will appear here.</div>
      </div>
    );
  }

  return (
    <div className="reviews-list">
      {reviews.map((r, i) => {
        const book = r.book || {};
        return (
          <div className="review-item" key={r.review_id || i}>
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
            <div className="review-item__body">
              <div className="review-item__meta">
                <Stars rating={r.score} count={0} />
                <span className="review-item__score">{r.score}/5</span>
                <span className="review-item__date">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString("en-MY", {
                    day: "numeric", month: "short", year: "numeric",
                  }) : ""}
                </span>
              </div>
              {r.comment && <p className="review-item__comment">{r.comment}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}