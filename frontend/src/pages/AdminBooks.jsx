import React, { useEffect, useState } from 'react';
import { bookService } from '../api/BookService';
import './AdminPages.css';

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

const AdminBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBooks = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await bookService.getBooks({ sort: 'title', limit: 30 });
        setBooks(response.items || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load the catalog overview.');
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, []);

  return (
    <div className="admin-page">
      <section className="admin-hero admin-hero-compact">
        <div className="container">
          <p className="admin-eyebrow">Admin Books</p>
          <h1>Catalog overview</h1>
          <p className="admin-subtitle">
            Quick stock and pricing snapshot for the current catalog.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="container">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : (
            <div className="card admin-card">
              <div className="admin-card-header">
                <div>
                  <h2>Books</h2>
                  <p>Read-only management snapshot using the live backend catalog.</p>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Featured</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((book) => (
                      <tr key={book.id}>
                        <td>{book.title}</td>
                        <td>{book.author}</td>
                        <td>{book.category || 'Uncategorized'}</td>
                        <td>{formatMoney(book.price)}</td>
                        <td>{book.stock}</td>
                        <td>{book.featured ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminBooks;
