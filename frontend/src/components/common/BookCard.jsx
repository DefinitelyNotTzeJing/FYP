import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './BookCard.css';

const BookCard = ({ book }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(book);
  };

  return (
    <Link to={`/books/${book.id}`} className="book-card">
      <div className="book-card-image">
        <img 
          src={book.cover_image || '/placeholder-book.jpg'} 
          alt={book.title}
          loading="lazy"
        />
        {book.discount && (
          <div className="book-badge">-{book.discount}%</div>
        )}
      </div>
      
      <div className="book-card-content">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
        
        <div className="book-rating">
          <span className="stars">
            {'★'.repeat(Math.floor(book.rating || 5))}
            {'☆'.repeat(5 - Math.floor(book.rating || 5))}
          </span>
          <span className="rating-count">({book.reviews_count || 0})</span>
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
          
          <button 
            onClick={handleAddToCart}
            className="btn-add-cart"
            aria-label="Add to cart"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 2L7.17 4H4a2 2 0 00-2 2v13a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2h-3.17L15 2H9z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        </div>
      </div>
    </Link>
  );
};

export default BookCard;