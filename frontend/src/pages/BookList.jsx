import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bookService } from '../api/BookService';
import BookCard from '../components/common/BookCard';
import './BookList.css';

const BookList = () => {
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const category = searchParams.get('category');
  const sort = searchParams.get('sort');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError('');

        const response = category
          ? await bookService.getBooksByCategory(category)
          : await bookService.getBooks({
              sort: sort || 'newest',
              limit: 24,
            });

        setBooks(response.items || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load books right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [category, sort]);

  return (
    <div className="book-list-page">
      <section className="book-list-hero">
        <div className="container">
          <p className="book-list-eyebrow">Book Catalog</p>
          <h1 className="book-list-title">
            {category ? `Books in ${category}` : 'Browse All Books'}
          </h1>
          <p className="book-list-subtitle">
            Discover titles available from the backend catalog.
          </p>
        </div>
      </section>

      <section className="book-list-section">
        <div className="container">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : books.length === 0 ? (
            <div className="book-list-empty card">
              <h2>No books found</h2>
              <p>The API is connected, but there are no matching books to display.</p>
            </div>
          ) : (
            <div className="book-list-grid">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BookList;
