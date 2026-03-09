import { useState, useEffect } from "react";
import { apiFetch } from "../../utils/api";
import Stars from "../stars/Stars";
import "../../styles/AuthorModal.css";

export default function AuthorModal({ author, onClose, onBookClick }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/authors/${author.author_id}`)
      .then((d) => { setDetail(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [author.author_id]);

  const books = detail?.books || [];

  return (
    <div className="author-modal__overlay" onClick={onClose}>
      <div className="author-modal" onClick={(e) => e.stopPropagation()}>
        <button className="author-modal__close" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="author-modal__header">
          <div className="author-modal__avatar">
            {author.image_url
              ? <img src={author.image_url} alt={author.name} />
              : <span>{author.name?.slice(0, 2).toUpperCase()}</span>
            }
          </div>
          <div className="author-modal__meta">
            <div className="author-modal__label">Author</div>
            <div className="author-modal__name">{author.name}</div>
            {detail?.bio && (
              <p className="author-modal__bio">{detail.bio}</p>
            )}
          </div>
        </div>

        {/* Books */}
        <div className="author-modal__section">
          <div className="author-modal__section-title">
            Books by {author.name}
            {books.length > 0 && <span className="author-modal__count">{books.length}</span>}
          </div>

          {loading ? (
            <div className="author-modal__loading">Loading…</div>
          ) : books.length === 0 ? (
            <div className="author-modal__empty">No books found for this author.</div>
          ) : (
            <div className="author-modal__books">
              {books.map((book) => (
                <div
                  key={book.book_id}
                  className="author-modal__book"
                  onClick={() => { onClose(); onBookClick?.(book); }}
                >
                  <div className="author-modal__book-cover">
                    {book.cover_image_url
                      ? <img src={book.cover_image_url} alt={book.book_name} />
                      : <span>{book.book_name?.slice(0, 2)}</span>
                    }
                  </div>
                  <div className="author-modal__book-info">
                    <div className="author-modal__book-title">{book.book_name}</div>
                    <div className="author-modal__book-category">{book.category?.name}</div>
                    <div className="author-modal__book-footer">
                      <span className="author-modal__book-price">
                        RM {parseFloat(book.price).toFixed(2)}
                      </span>
                      <Stars rating={book.book_total_rating ?? 0} count={book.book_number_of_rating ?? 0} />
                    </div>
                  </div>
                  <div className="author-modal__book-chevron">›</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}