import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookService } from '../api/BookService';
import BookCard from '../components/common/BookCard';
import './Home.css';

const Home = () => {
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const [featured, arrivals] = await Promise.all([
          bookService.getBooks({ featured: true, limit: 6 }),
          bookService.getBooks({ sort: 'newest', limit: 8 })
        ]);
        setFeaturedBooks(featured.items || []);
        setNewArrivals(arrivals.items || []);
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Discover Your
              <span className="hero-highlight">Next Chapter</span>
            </h1>
            <p className="hero-description">
              Curated collections of timeless classics, contemporary bestsellers,
              and hidden literary gems waiting to be discovered.
            </p>
            <div className="hero-actions">
              <Link to="/books" className="btn btn-primary">
                Explore Books
              </Link>
              <Link to="/books?category=bestsellers" className="btn btn-outline">
                View Bestsellers
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-book book-1"></div>
            <div className="floating-book book-2"></div>
            <div className="floating-book book-3"></div>
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="section featured-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Featured Picks</h2>
            <p className="section-subtitle">
              Handpicked recommendations from our curators
            </p>
          </div>
          
          {loading ? (
            <div className="loading-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-card"></div>
              ))}
            </div>
          ) : (
            <div className="books-grid">
              {featuredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="section categories-section">
        <div className="container">
          <h2 className="section-title">Browse by Genre</h2>
          <div className="categories-grid">
            <Link to="/books?category=fiction" className="category-card fiction">
              <div className="category-icon">📚</div>
              <h3>Fiction</h3>
              <p>Novels & Stories</p>
            </Link>
            <Link to="/books?category=non-fiction" className="category-card non-fiction">
              <div className="category-icon">🔬</div>
              <h3>Non-Fiction</h3>
              <p>Knowledge & Facts</p>
            </Link>
            <Link to="/books?category=mystery" className="category-card mystery">
              <div className="category-icon">🔍</div>
              <h3>Mystery</h3>
              <p>Thrillers & Crime</p>
            </Link>
            <Link to="/books?category=romance" className="category-card romance">
              <div className="category-icon">💕</div>
              <h3>Romance</h3>
              <p>Love Stories</p>
            </Link>
            <Link to="/books?category=sci-fi" className="category-card sci-fi">
              <div className="category-icon">🚀</div>
              <h3>Sci-Fi & Fantasy</h3>
              <p>Other Worlds</p>
            </Link>
            <Link to="/books?category=biography" className="category-card biography">
              <div className="category-icon">👤</div>
              <h3>Biography</h3>
              <p>Life Stories</p>
            </Link>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="section new-arrivals-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">New Arrivals</h2>
            <Link to="/books?sort=newest" className="view-all">
              View All →
            </Link>
          </div>
          
          {loading ? (
            <div className="loading-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton-card"></div>
              ))}
            </div>
          ) : (
            <div className="books-grid wide">
              {newArrivals.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter-section">
        <div className="container">
          <div className="newsletter-content">
            <h2>Join Our Book Club</h2>
            <p>Get weekly recommendations and exclusive deals delivered to your inbox</p>
            <form className="newsletter-form">
              <input
                type="email"
                placeholder="Enter your email"
                className="newsletter-input"
              />
              <button type="submit" className="btn btn-primary">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
