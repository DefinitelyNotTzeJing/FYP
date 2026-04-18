import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Stars from "../stars/Stars";
import "../../styles/FeaturedHero.css";

const GRACE_MS    = 1000;
const GRACE_MOVE  = 8;
const HOLD_MS     = 3000;
const SWIPE_PX    = 50;
const MOVE_CANCEL = 14;
const TAP_MAX_MS  = 280;

export default function FeaturedHero({ books, onBookClick, onAddToCart, onAddToWishlist }) {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);

  // ── Gesture state ──────────────────────────────────────────────────────────
  const heroSwipe     = useRef(null);
  const coverRef      = useRef(null);
  const phaseRef      = useRef("idle");
  const [phase,    setPhase]    = useState("idle");
  const [progress, setProgress] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const holdStartTime = useRef(null);
  const holdPos       = useRef(null);
  const armedPos      = useRef(null);
  const rafId         = useRef(null);
  const graceTimer    = useRef(null);
  const blockClick    = useRef(false);

  const updatePhase = (p) => { phaseRef.current = p; setPhase(p); };

  const cancelHold = useCallback((wasIntentional = false) => {
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    if (graceTimer.current) { clearTimeout(graceTimer.current); graceTimer.current = null; }
    holdStartTime.current = null; holdPos.current = null; armedPos.current = null;
    if (wasIntentional) blockClick.current = true;
    setProgress(0); setSwipeDir(null); updatePhase("idle");
  }, []);

  // Reset gesture when active slide changes
  useEffect(() => { cancelHold(false); }, [active, cancelHold]);

  // ── Slide navigation ───────────────────────────────────────────────────────
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

  useEffect(() => {
    if (phase !== "armed") return;
    const prevent = (e) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [phase]);

  useEffect(() => () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (graceTimer.current) clearTimeout(graceTimer.current);
  }, []);

  if (!books.length) return null;

  const book = books[active];

  // ── Gesture handlers ───────────────────────────────────────────────────────
  function startFill() {
    const fillStart = performance.now();
    function tick(now) {
      if (phaseRef.current !== "holding") return;
      const p = Math.min((now - fillStart) / HOLD_MS, 1);
      setProgress(p);
      if (p >= 1) { armedPos.current = { ...holdPos.current }; updatePhase("armed"); }
      else { rafId.current = requestAnimationFrame(tick); }
    }
    rafId.current = requestAnimationFrame(tick);
  }

  function startHold(x, y) {
    if (phaseRef.current !== "idle") return;
    holdPos.current = { x, y }; armedPos.current = null;
    holdStartTime.current = performance.now();
    updatePhase("grace");
    graceTimer.current = setTimeout(() => {
      if (phaseRef.current !== "grace") return;
      updatePhase("holding");
      startFill();
    }, GRACE_MS);
  }

  function getZone(y) {
    const el = coverRef.current;
    if (!el) return "mid";
    const { top, height } = el.getBoundingClientRect();
    const rel = y - top;
    if (rel < height / 3) return "up";
    if (rel > (height * 2) / 3) return "down";
    return "mid";
  }

  function onMove(x, y) {
    if (phaseRef.current === "grace") {
      const dx = x - holdPos.current.x, dy = y - holdPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > GRACE_MOVE) cancelHold(false);
    } else if (phaseRef.current === "holding") {
      const dx = x - holdPos.current.x, dy = y - holdPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL) cancelHold(true);
    } else if (phaseRef.current === "armed") {
      setSwipeDir(getZone(y));
    }
  }

  function onRelease(x, y) {
    if (phaseRef.current === "grace") {
      cancelHold(false);
      blockClick.current = true;
      onBookClick?.(book);
    } else if (phaseRef.current === "holding") {
      cancelHold(true);
    } else if (phaseRef.current === "armed") {
      const zone = getZone(y);
      if (zone === "up")        doAction("cart");
      else if (zone === "down") doAction("wishlist");
      else                      cancelHold(true);
    }
  }

  function doAction(type) {
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    blockClick.current = true; setSwipeDir(null); updatePhase("feedback");
    if (type === "cart" && book.available_quantity === 0) {
      setFeedback("oos");
    } else {
      setFeedback(type);
      if (type === "cart") onAddToCart?.(book); else onAddToWishlist?.(book);
    }
    setTimeout(() => {
      setFeedback(null); setProgress(0);
      armedPos.current = null; holdPos.current = null;
      updatePhase("idle");
    }, 1200);
  }

  const onTouchStart = (e) => { e.preventDefault(); const t = e.touches[0]; startHold(t.clientX, t.clientY); };
  const onTouchMove  = (e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); };
  const onTouchEnd   = (e) => { if (phaseRef.current !== "idle") e.preventDefault(); const t = e.changedTouches[0]; onRelease(t.clientX, t.clientY); };
  const onMouseDown  = (e) => { if (e.button === 0) startHold(e.clientX, e.clientY); };
  const onMouseMoveH = (e) => onMove(e.clientX, e.clientY);
  const onMouseUp    = (e) => { if (e.button === 0) onRelease(e.clientX, e.clientY); };
  const onMouseLeave = ()  => { if (phaseRef.current === "holding") cancelHold(true); };
  const handleCoverClick = () => {
    if (blockClick.current) { blockClick.current = false; return; }
    if (phaseRef.current !== "idle") return;
    onBookClick?.(book);
  };

  const isHolding  = phase === "holding";
  const isArmed    = phase === "armed";
  const isFeedback = phase === "feedback";

  return (
    <section
      className="hero"
      aria-label="Featured books"
      onTouchStart={(e) => {
        const t = e.touches[0];
        heroSwipe.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      }}
      onTouchEnd={(e) => {
        if (!heroSwipe.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - heroSwipe.current.x;
        const dy = t.clientY - heroSwipe.current.y;
        const dt = Date.now() - heroSwipe.current.time;
        heroSwipe.current = null;
        if (dt < 400 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          dx < 0 ? next() : prev();
        }
      }}
    >
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

        {/* Cover — gesture target */}
        <div
          className="hero__cover-wrap"
          aria-label={`View ${book.book_name}`}
          onClick={handleCoverClick}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMoveH}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={() => cancelHold(true)}
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: "none", WebkitUserSelect: "none", touchAction: "none" }}
        >
          <div
            ref={coverRef}
            className={[
              "hero__cover",
              isHolding  && "hero__cover--holding",
              isArmed    && "hero__cover--armed",
            ].filter(Boolean).join(" ")}
          >
            {book.cover_image_url
              ? <img src={book.cover_image_url} alt={book.book_name} draggable="false" style={{ pointerEvents: "none" }} />
              : <div className="hero__cover-placeholder">{book.book_name}</div>}

            {(isHolding || isArmed) && (
              <div className="hero__fill" style={{ transform: `scaleY(${isArmed ? 1 : progress})` }} />
            )}

            {isArmed && (
              <div className="hero__hints">
                <div className={`hero__hint hero__hint--up${swipeDir === "up" ? " hero__hint--active" : ""}`}>↑ Cart</div>
                <div className={`hero__hint hero__hint--mid${swipeDir === "mid" ? " hero__hint--active" : ""}`}>✕ Cancel</div>
                <div className={`hero__hint hero__hint--down${swipeDir === "down" ? " hero__hint--active" : ""}`}>Wishlist ↓</div>
              </div>
            )}

            {isFeedback && (
              <div className={`hero__feedback hero__feedback--${feedback}`}>
                {feedback === "cart" ? "✓ Added to Cart" : feedback === "wishlist" ? "♥ Wishlisted" : "Out of Stock"}
              </div>
            )}
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
