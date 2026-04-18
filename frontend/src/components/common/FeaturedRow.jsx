import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "../../styles/FeaturedHero.css";

const GRACE_MS    = 1000;
const GRACE_MOVE  = 8;
const HOLD_MS     = 3000;
const SWIPE_PX    = 50;
const MOVE_CANCEL = 14;

function FCard({ book, onBookClick, onAddToCart, onAddToWishlist }) {
  const phaseRef      = useRef("idle");
  const [phase,    setPhase]    = useState("idle");
  const [progress, setProgress] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const holdPos    = useRef(null);
  const armedPos   = useRef(null);
  const rafId      = useRef(null);
  const graceTimer = useRef(null);
  const blockClick    = useRef(false);

  const updatePhase = (p) => { phaseRef.current = p; setPhase(p); };

  const cancelHold = useCallback((wasIntentional = false) => {
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    if (graceTimer.current) { clearTimeout(graceTimer.current); graceTimer.current = null; }
    holdPos.current = null; armedPos.current = null;
    if (wasIntentional) blockClick.current = true;
    setProgress(0); setSwipeDir(null); updatePhase("idle");
  }, []);

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
    updatePhase("grace");
    graceTimer.current = setTimeout(() => {
      if (phaseRef.current !== "grace") return;
      updatePhase("holding");
      startFill();
    }, GRACE_MS);
  }

  function onMove(x, y) {
    if (phaseRef.current === "grace") {
      const dx = x - holdPos.current.x, dy = y - holdPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > GRACE_MOVE) cancelHold(false);
    } else if (phaseRef.current === "holding") {
      const dx = x - holdPos.current.x, dy = y - holdPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL) cancelHold(true);
    } else if (phaseRef.current === "armed" && armedPos.current) {
      const dy = y - armedPos.current.y;
      setSwipeDir(dy < -10 ? "up" : dy > 10 ? "down" : null);
    }
  }

  function onRelease(x, y) {
    if (phaseRef.current === "grace") {
      cancelHold(false);
      onBookClick?.(book);
    } else if (phaseRef.current === "holding") {
      cancelHold(true);
    } else if (phaseRef.current === "armed" && armedPos.current) {
      const dy = y - armedPos.current.y;
      if (dy < -SWIPE_PX)     doAction("cart");
      else if (dy > SWIPE_PX) doAction("wishlist");
      else                    cancelHold(true);
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

  const onTouchStart = (e) => { const t = e.touches[0]; startHold(t.clientX, t.clientY); };
  const onTouchMove  = (e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); };
  const onTouchEnd   = (e) => { if (phaseRef.current !== "idle") e.preventDefault(); const t = e.changedTouches[0]; onRelease(t.clientX, t.clientY); };
  const onMouseDown  = (e) => { if (e.button === 0) startHold(e.clientX, e.clientY); };
  const onMouseMoveH = (e) => onMove(e.clientX, e.clientY);
  const onMouseUp    = (e) => { if (e.button === 0) onRelease(e.clientX, e.clientY); };
  const onMouseLeave = ()  => { if (phaseRef.current === "holding" || phaseRef.current === "grace") cancelHold(true); };
  const handleClick  = ()  => {
    if (blockClick.current) { blockClick.current = false; return; }
    if (phaseRef.current !== "idle") return;
    onBookClick?.(book);
  };

  useEffect(() => () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (graceTimer.current) clearTimeout(graceTimer.current);
  }, []);

  const isHolding  = phase === "holding";
  const isArmed    = phase === "armed";
  const isFeedback = phase === "feedback";

  return (
    <div
      className={["fcard", isHolding && "fcard--holding", isArmed && "fcard--armed"].filter(Boolean).join(" ")}
      onClick={handleClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMoveH}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => cancelHold(true)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: "none", WebkitUserSelect: "none", touchAction: (phase === "holding" || phase === "armed" || phase === "feedback") ? "none" : "pan-x pan-y" }}
    >
      <div className="fcard__cover">
        {book.cover_image_url
          ? <img src={book.cover_image_url} alt={book.book_name} loading="lazy" draggable="false" style={{ pointerEvents: "none" }} />
          : <div className="fcard__placeholder">{book.book_name}</div>}

        {(isHolding || isArmed) && (
          <div className="fcard__fill" style={{ transform: `scaleY(${isArmed ? 1 : progress})` }} />
        )}

        {isArmed && (
          <div className="fcard__hints">
            <div className={`fcard__hint${swipeDir === "up" ? " fcard__hint--active" : ""}`}>↑ Cart</div>
            <div className={`fcard__hint${swipeDir === "down" ? " fcard__hint--active" : ""}`}>Wishlist ↓</div>
          </div>
        )}

        {isFeedback && (
          <div className={`fcard__feedback fcard__feedback--${feedback}`}>
            {feedback === "cart" ? "✓ Cart" : feedback === "wishlist" ? "♥ Saved" : "OOS"}
          </div>
        )}
      </div>
      <div className="fcard__info">
        <div className="fcard__title">{book.book_name}</div>
        <div className="fcard__author">{book.author?.name}</div>
        <div className="fcard__price">RM {parseFloat(book.price).toFixed(2)}</div>
      </div>
    </div>
  );
}

export default function FeaturedRow({ books, onBookClick, onAddToCart, onAddToWishlist }) {
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
          <FCard
            key={book.book_id}
            book={book}
            onBookClick={onBookClick}
            onAddToCart={onAddToCart}
            onAddToWishlist={onAddToWishlist}
          />
        ))}
      </div>
    </div>
  );
}
