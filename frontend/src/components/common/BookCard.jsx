import Stars from "../stars/Stars";
import "../../styles/BookCard.css";

export default function BookCard({ book, onClick }) {
  return (
    <div className="book-card" onClick={() => onClick(book)}>
      {book.cover_image_url ? (
        <div className="book-card__cover">
          <img src={book.cover_image_url} alt={book.book_name} />
        </div>
      ) : (
        <div className="book-card__cover">{book.book_name}</div>
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