import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { bookService } from '../api/BookService';
import './BookDetail.css';

const BookDetail = () => {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await bookService.getBook(id);
        setBook(response);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load this book.');
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="book-detail-page">
        <div className="container">
          <div className="alert alert-error">{error || 'Book not found.'}</div>
          <Link to="/books" className="btn btn-outline">
            Back to Books
          </Link>
        </div>
      </div>
    );
  }

  const handleImageError = (event) => {
    if (book.fallbackImageUrl && event.currentTarget.src !== book.fallbackImageUrl) {
      event.currentTarget.src = book.fallbackImageUrl;
    }
  };

  return (
    <div className="book-detail-page">
      <div className="container">
        <div className="book-detail-shell">
          <div className="book-detail-cover">
            <img src={book.imageUrl} alt={book.title} onError={handleImageError} />
          </div>

          <div className="book-detail-content">
            <p className="book-detail-eyebrow">{book.category || 'Book Detail'}</p>
            <h1>{book.title}</h1>
            <p className="book-detail-author">by {book.author}</p>
            <div className="book-detail-meta">
              <span>${book.price.toFixed(2)}</span>
              <span>{book.stock} in stock</span>
              <span>{book.rating.toFixed(1)} / 5</span>
            </div>
            <p className="book-detail-description">
              {book.description || 'No description available for this book yet.'}
            </p>

            <div className="book-detail-actions">
              <Link to="/books" className="btn btn-outline">
                Back to Books
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
