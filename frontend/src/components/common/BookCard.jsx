import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './BookCard.css';

const BookCard = ({ book }) => {
  const { addToCart, dragSession, startDraggingBook } = useCart();
  const isLifted = dragSession?.book?.id === book.id;

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    addToCart(book);
  };

  const handleLiftPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const sourceRect = event.currentTarget
      .closest('.book-card')
      ?.getBoundingClientRect();

    startDraggingBook(book, {
      pointerX: event.clientX,
      pointerY: event.clientY,
      sourceRect: sourceRect
        ? {
            left: sourceRect.left,
            top: sourceRect.top,
            width: sourceRect.width,
            height: sourceRect.height,
          }
        : null,
    });
  };

  const handleImageError = (event) => {
    if (book.fallbackImageUrl && event.currentTarget.src !== book.fallbackImageUrl) {
      event.currentTarget.src = book.fallbackImageUrl;
    }
  };

  return (
    <Link to={`/books/${book.id}`} className={`book-card ${isLifted ? 'is-lifted' : ''}`}>
      <div className="book-card-image">
        <img
          src={book.imageUrl || '/placeholder-book.jpg'}
          alt={book.title}
          loading="lazy"
          onError={handleImageError}
        />
        <div className="book-card-image-tint"></div>

        <button
          type="button"
          className="book-lift-handle"
          onPointerDown={handleLiftPointerDown}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          aria-label={`Lift ${book.title} into cart`}
        >
          <span className="book-lift-icon">+</span>
          <span className="book-lift-copy">
            <strong>{isLifted ? 'Book In Motion' : 'Lift Into Cart'}</strong>
            <small>{isLifted ? 'Move it to the basket' : 'Press and glide toward the basket'}</small>
          </span>
        </button>

        {book.discount ? (
          <div className="book-badge">-{book.discount}%</div>
        ) : null}
      </div>

      <div className="book-card-content">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>

        <div className="book-rating">
          <span className="stars">
            {'\u2605'.repeat(Math.floor(book.rating || 5))}
            {'\u2606'.repeat(5 - Math.floor(book.rating || 5))}
          </span>
          <span className="rating-count">({book.ratingCount || 0})</span>
        </div>

        <div className="book-footer">
          <div className="book-price">
            {book.discount ? (
              <>
                <span className="price-original">${book.price}</span>
                <span className="price-current">
                  ${(book.price * (1 - book.discount / 100)).toFixed(2)}
                </span>
              </>
            ) : (
              <span className="price-current">${book.price}</span>
            )}
          </div>

          <div className="book-card-actions">
            <span className="book-card-gesture">
              {isLifted ? 'Carry to basket' : 'Tap or drag'}
            </span>

            <button
              type="button"
              onClick={handleAddToCart}
              className="btn-add-cart"
              aria-label="Add to cart"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="9" cy="19" r="1.8" />
                <circle cx="17" cy="19" r="1.8" />
                <path d="M3 4h2l2.2 9.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.78L21 7H7.4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BookCard;
