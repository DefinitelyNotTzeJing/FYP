import Stars from "../stars/Stars";
import "../../styles/BookCard.css";

export default function BookCard({ book, onClick }) {
  return (
    <div className="book-card" onClick={() => onClick(book)}>
      {book.cover_image_url ? (
        <div className="book-card__cover">
          <img src={book.cover_image_url} alt={book.book_name} loading="lazy" />
        </div>
      ) : (
        <div className="book-card__cover">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
      )}

      <div className="book-card__info">
        {book.is_featured && <div className="badge badge--featured">Featured</div>}
        {book.available_quantity === 0 && (
          <div className="badge badge--oos">Out of Stock</div>
        )}
        <div className="book-card__title">{book.book_name}</div>
        <div className="book-card__author">{book.author?.name}</div>
        <div className="book-card__footer">
          <span className="book-card__price">
            RM {parseFloat(book.price).toFixed(2)}
          </span>
          <Stars rating={book.book_total_rating} count={book.book_number_of_rating} />
        </div>
      </div>
    </div>
  );
}