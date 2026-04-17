import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Stars from "../stars/Stars";
import "../../styles/FeaturedHero.css";

export default function FeaturedHero({ books, onBookClick }) {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);

  const go = useCallback((idx) => {
    setFading(true);
    setTimeout(() => { setActive(idx); setFading(false); }, 280);
  }, []);

  const prev = useCallback(() => go((active - 1 + books.length) % books.length), [active, books.length, go]);
  const next = useCallback(() => go((active + 1) % books.length), [active, books.length, go]);

  useEffect(() => {
    if (books.length <= 1) return;
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [next, books.length]);

  if (!books.length) return null;

  const book = books[active];

  return (
    <section className="hero" aria-label="Featured books">
      <div className={`hero__slide${fading ? " hero__slide--out" : ""}`}>
        <div className="hero__content">
          {book.category?.name && (
            <span className="hero__pill">{book.category.name}</span>
          )}
          <h2 className="hero__title">{book.book_name}</h2>
          <p className="hero__author">by {book.author?.name}</p>
          {book.book_description && (
            <p className="hero__desc">{book.book_description}</p>
          )}
          <div className="hero__meta">
            <span className="hero__price">RM {parseFloat(book.price).toFixed(2)}</span>
            {book.book_total_rating > 0 && (
              <Stars rating={book.book_total_rating} count={book.book_number_of_rating} />
            )}
          </div>
          <button className="hero__cta" onClick={() => onBookClick(book)}>
            View Book <ChevronRight size={15} />
          </button>
        </div>

        <div className="hero__cover-wrap" onClick={() => onBookClick(book)} aria-label={`View ${book.book_name}`}>
          <div className="hero__cover">
            {book.cover_image_url
              ? <img src={book.cover_image_url} alt={book.book_name} />
              : <div className="hero__cover-placeholder">{book.book_name}</div>}
          </div>
        </div>
      </div>

      {books.length > 1 && (
        <>
          <button className="hero__arrow hero__arrow--left" onClick={prev} aria-label="Previous featured book">
            <ChevronLeft size={18} />
          </button>
          <button className="hero__arrow hero__arrow--right" onClick={next} aria-label="Next featured book">
            <ChevronRight size={18} />
          </button>
          <div className="hero__dots" role="tablist">
            {books.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === active}
                className={`hero__dot${i === active ? " hero__dot--active" : ""}`}
                onClick={() => go(i)}
                aria-label={`Featured book ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
