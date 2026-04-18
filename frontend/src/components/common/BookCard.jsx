import { useRef, useEffect, useState, useCallback } from "react";
import Stars from "../stars/Stars";
import "../../styles/BookCard.css";

const HOLD_MS      = 3000;
const SWIPE_PX     = 50;
const MOVE_CANCEL  = 14;  // px drift allowed during hold
const TAP_MAX_MS   = 280; // treat as tap if released this quickly

export default function BookCard({ book, onClick, onAddToCart, onAddToWishlist, index = 0 }) {
  const cardRef = useRef(null);

  // phase: idle | holding | armed | feedback
  const phaseRef  = useRef("idle");
  const [phase,    setPhase]    = useState("idle");
  const [progress, setProgress] = useState(0);          // 0-1 during hold
  const [swipeDir, setSwipeDir] = useState(null);       // 'up' | 'down'
  const [feedback, setFeedback] = useState(null);       // 'cart' | 'wishlist'
  const [visible,  setVisible]  = useState(false);      // scroll-reveal

  const holdStartTime = useRef(null);
  const holdPos       = useRef(null);  // {x,y} where finger/mouse pressed
  const armedPos      = useRef(null);  // reference point once armed
  const rafId         = useRef(null);
  const blockClick    = useRef(false); // prevents click firing after a hold attempt

  const updatePhase = (p) => { phaseRef.current = p; setPhase(p); };

  const cancelHold = useCallback((wasIntentional = false) => {
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    holdStartTime.current = null;
    holdPos.current  = null;
    armedPos.current = null;
    if (wasIntentional) blockClick.current = true;
    setProgress(0);
    setSwipeDir(null);
    updatePhase("idle");
  }, []);

  function startHold(x, y) {
    if (phaseRef.current !== "idle") return;
    holdPos.current      = { x, y };
    armedPos.current     = null;
    holdStartTime.current = performance.now();
    updatePhase("holding");

    function tick(now) {
      if (phaseRef.current !== "holding") return;
      const p = Math.min((now - holdStartTime.current) / HOLD_MS, 1);
      setProgress(p);
      if (p >= 1) {
        armedPos.current = { ...holdPos.current };
        updatePhase("armed");
      } else {
        rafId.current = requestAnimationFrame(tick);
      }
    }
    rafId.current = requestAnimationFrame(tick);
  }

  function onMove(x, y) {
    if (phaseRef.current === "holding") {
      const dx = x - holdPos.current.x;
      const dy = y - holdPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL) cancelHold(true);
    } else if (phaseRef.current === "armed" && armedPos.current) {
      const dy = y - armedPos.current.y;
      setSwipeDir(dy < -10 ? "up" : dy > 10 ? "down" : null);
    }
  }

  function onRelease(x, y) {
    if (phaseRef.current === "holding") {
      const duration = performance.now() - holdStartTime.current;
      cancelHold(duration > TAP_MAX_MS);
      if (duration <= TAP_MAX_MS) onClick?.(book); // quick tap → open modal
    } else if (phaseRef.current === "armed" && armedPos.current) {
      const dy = y - armedPos.current.y;
      if (dy < -SWIPE_PX)      doAction("cart");
      else if (dy > SWIPE_PX)  doAction("wishlist");
      else                     cancelHold(true);
    }
  }

  function doAction(type) {
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    blockClick.current = true;
    setSwipeDir(null);
    updatePhase("feedback");

    if (type === "cart" && book.available_quantity === 0) {
      setFeedback("oos");
    } else {
      setFeedback(type);
      if (type === "cart") onAddToCart?.(book);
      else                 onAddToWishlist?.(book);
    }
    setTimeout(() => {
      setFeedback(null);
      setProgress(0);
      armedPos.current = null;
      holdPos.current  = null;
      updatePhase("idle");
    }, 1200);
  }

  // ── Touch handlers ─────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    e.preventDefault(); // prevent ghost click on touch devices
    const t = e.touches[0];
    startHold(t.clientX, t.clientY);
  };
  const onTouchMove  = (e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); };
  const onTouchEnd   = (e) => { const t = e.changedTouches[0]; onRelease(t.clientX, t.clientY); };

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const onMouseDown  = (e) => { if (e.button === 0) startHold(e.clientX, e.clientY); };
  const onMouseMove  = (e) => onMove(e.clientX, e.clientY);
  const onMouseUp    = (e) => { if (e.button === 0) onRelease(e.clientX, e.clientY); };
  const onMouseLeave = ()  => { if (phaseRef.current === "holding") cancelHold(true); };

  const handleClick = () => {
    if (blockClick.current) { blockClick.current = false; return; }
    if (phaseRef.current !== "idle") return;
    onClick?.(book);
  };

  // ── Intersection observer (scroll reveal) ─────────────────────────────────
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const delay = Math.min(index % 6, 5) * 55;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setVisible(true), delay);
        obs.unobserve(el);
      }
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [index]);

  useEffect(() => () => { if (rafId.current) cancelAnimationFrame(rafId.current); }, []);

  const isHolding  = phase === "holding";
  const isArmed    = phase === "armed";
  const isFeedback = phase === "feedback";

  return (
    <div
      ref={cardRef}
      className={[
        "book-card",
        visible    ? "book-card--visible"       : "book-card--hidden",
        isHolding  && "book-card--holding",
        isArmed    && "book-card--armed",
        isFeedback && "book-card--feedback-state",
      ].filter(Boolean).join(" ")}
      onClick={handleClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => cancelHold(true)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: "none", WebkitUserSelect: "none", touchAction: "none" }}
    >
      {/* ── Cover with overlay ───────────────────────────────────────────── */}
      <div className="book-card__cover-wrap">
        {book.cover_image_url ? (
          <div className="book-card__cover">
            <img src={book.cover_image_url} alt={book.book_name} loading="lazy" draggable="false" />
          </div>
        ) : (
          <div className="book-card__cover">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
        )}

        {/* Progress fill — rises from bottom */}
        {(isHolding || isArmed) && (
          <div
            className="book-card__fill"
            style={{ transform: `scaleY(${isArmed ? 1 : progress})` }}
          />
        )}

        {/* Swipe hints shown when armed */}
        {isArmed && (
          <div className="book-card__hints">
            <div className={`book-card__hint book-card__hint--up${swipeDir === "up" ? " book-card__hint--active" : ""}`}>
              <span className="book-card__hint-arrow">↑</span>
              <span>Cart</span>
            </div>
            <div className={`book-card__hint book-card__hint--down${swipeDir === "down" ? " book-card__hint--active" : ""}`}>
              <span>Wishlist</span>
              <span className="book-card__hint-arrow">↓</span>
            </div>
          </div>
        )}

        {/* Action feedback */}
        {isFeedback && (
          <div className={`book-card__action-feedback book-card__action-feedback--${feedback}`}>
            {feedback === "cart" ? "✓ Added to Cart" : feedback === "wishlist" ? "♥ Wishlisted" : "Out of Stock"}
          </div>
        )}
      </div>

      {/* ── Book info ────────────────────────────────────────────────────── */}
      <div className="book-card__info">
        {book.is_featured && <div className="badge badge--featured">Featured</div>}
        {book.available_quantity === 0 && <div className="badge badge--preorder">Pre-order</div>}
        <div className="book-card__title">{book.book_name}</div>
        <div className="book-card__author">{book.author?.name}</div>
        <div className="book-card__footer">
          <span className="book-card__price">RM {parseFloat(book.price).toFixed(2)}</span>
          <Stars rating={book.book_total_rating} count={book.book_number_of_rating} />
        </div>
      </div>
    </div>
  );
}
