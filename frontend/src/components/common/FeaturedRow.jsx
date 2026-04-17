import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "../../styles/FeaturedHero.css";

export default function FeaturedRow({ books, onBookClick }) {
  const trackRef = useRef(null);

  if (!books.length) return null;

  const scroll = (dir) => {
    trackRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <div className="frow">
      <div className="frow__header">
        <span className="frow__label">Featured</span>
        <div className="frow__rule" />
        <button className="frow__arr" onClick={() => scroll(-1)} aria-label="Scroll left">
          <ChevronLeft size={16} />
        </button>
        <button className="frow__arr" onClick={() => scroll(1)} aria-label="Scroll right">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="frow__track" ref={trackRef}>
        {books.map((book) => (
          <div key={book.book_id} className="fcard" onClick={() => onBookClick(book)}>
            <div className="fcard__cover">
              {book.cover_image_url
                ? <img src={book.cover_image_url} alt={book.book_name} loading="lazy" />
                : <div className="fcard__placeholder">{book.book_name}</div>}
            </div>
            <div className="fcard__info">
              <div className="fcard__title">{book.book_name}</div>
              <div className="fcard__author">{book.author?.name}</div>
              <div className="fcard__price">RM {parseFloat(book.price).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
