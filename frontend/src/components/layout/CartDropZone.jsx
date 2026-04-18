import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './CartDropZone.css';

const CAPTURE_DURATION_MS = 320;

function isPointInsideRect(point, rect) {
  if (!point || !rect) {
    return false;
  }

  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

function getCapturePoint(rect) {
  return {
    x: rect.left + rect.width * 0.34,
    y: rect.top + rect.height * 0.52,
  };
}

const CartDropZone = () => {
  const {
    dragSession,
    cartNotice,
    dismissCartNotice,
    getCartCount,
    finishDraggingBook,
    dropDraggedBookToCart,
  } = useCart();
  const zoneRef = useRef(null);
  const clearNoticeTimeoutRef = useRef(null);
  const captureTimeoutRef = useRef(null);
  const [pointer, setPointer] = useState(null);
  const [previewBook, setPreviewBook] = useState(null);
  const [phase, setPhase] = useState('hidden');
  const [isOverTarget, setIsOverTarget] = useState(false);
  const [capturePoint, setCapturePoint] = useState(null);

  useEffect(() => {
    return () => {
      if (clearNoticeTimeoutRef.current) {
        clearTimeout(clearNoticeTimeoutRef.current);
      }

      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!cartNotice) {
      return undefined;
    }

    if (clearNoticeTimeoutRef.current) {
      clearTimeout(clearNoticeTimeoutRef.current);
    }

    clearNoticeTimeoutRef.current = window.setTimeout(() => {
      dismissCartNotice();
      clearNoticeTimeoutRef.current = null;
    }, 2200);

    return () => {
      if (clearNoticeTimeoutRef.current) {
        clearTimeout(clearNoticeTimeoutRef.current);
        clearNoticeTimeoutRef.current = null;
      }
    };
  }, [cartNotice, dismissCartNotice]);

  useEffect(() => {
    if (!dragSession) {
      return undefined;
    }

    setPreviewBook(dragSession.book);
    setPointer({
      x: dragSession.pointerX,
      y: dragSession.pointerY,
    });
    setPhase('following');
    setIsOverTarget(false);
    setCapturePoint(null);

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const updateHoverState = (nextPoint) => {
      const rect = zoneRef.current?.getBoundingClientRect();
      setIsOverTarget(isPointInsideRect(nextPoint, rect));
    };

    const handlePointerMove = (event) => {
      const nextPoint = {
        x: event.clientX,
        y: event.clientY,
      };

      setPointer(nextPoint);
      updateHoverState(nextPoint);
    };

    const handlePointerUp = (event) => {
      const releasedPoint = {
        x: event.clientX,
        y: event.clientY,
      };
      const rect = zoneRef.current?.getBoundingClientRect();
      const releasedInsideTarget = isPointInsideRect(releasedPoint, rect);

      if (!releasedInsideTarget || !rect) {
        finishDraggingBook();
        setPhase('hidden');
        setIsOverTarget(false);
        setPointer(null);
        setPreviewBook(null);
        return;
      }

      setIsOverTarget(true);
      setCapturePoint(getCapturePoint(rect));
      setPointer(releasedPoint);
      setPhase('capture');

      captureTimeoutRef.current = window.setTimeout(() => {
        dropDraggedBookToCart(dragSession.book);
        setPhase('hidden');
        setCapturePoint(null);
        setPointer(null);
        setPreviewBook(null);
        setIsOverTarget(false);
        captureTimeoutRef.current = null;
      }, CAPTURE_DURATION_MS);
    };

    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      finishDraggingBook();
      setPhase('hidden');
      setIsOverTarget(false);
      setPointer(null);
      setPreviewBook(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [dragSession, dropDraggedBookToCart, finishDraggingBook]);

  const panelMode = dragSession
    ? isOverTarget
      ? 'armed'
      : 'dragging'
    : cartNotice
      ? 'notice'
      : 'idle';

  const panelVisible = Boolean(dragSession || cartNotice || phase === 'capture');
  const stageBook = dragSession?.book || cartNotice;
  const panelTitle = dragSession?.book?.title || cartNotice?.title || 'Reading Basket';
  const panelSubtitle = dragSession
    ? isOverTarget
      ? 'Release now. We will slide it into your basket.'
      : 'Guide the book into the basket mouth.'
    : cartNotice
      ? 'Filed into your cart. You can keep browsing or open the basket.'
      : 'Drag a title here.';

  const previewStyle = useMemo(() => {
    if (!previewBook) {
      return null;
    }

    const activePoint = phase === 'capture' && capturePoint ? capturePoint : pointer;
    if (!activePoint) {
      return null;
    }

    return {
      '--preview-x': `${activePoint.x}px`,
      '--preview-y': `${activePoint.y}px`,
      '--preview-rotate': phase === 'capture' ? '-18deg' : isOverTarget ? '-8deg' : '-3deg',
      '--preview-scale': phase === 'capture' ? '0.28' : isOverTarget ? '1.04' : '1',
      '--preview-lift': phase === 'capture' ? '0px' : isOverTarget ? '-8px' : '0px',
    };
  }, [capturePoint, isOverTarget, phase, pointer, previewBook]);

  const stageImage =
    stageBook?.imageUrl || stageBook?.fallbackImageUrl || cartNotice?.imageUrl || '';
  const previewImage = previewBook?.imageUrl || previewBook?.fallbackImageUrl || '';
  const previewCategory = previewBook?.category || 'Book';
  const previewAuthor = previewBook?.author || 'Unknown Author';

  return (
    <>
      <aside
        ref={zoneRef}
        className={`cart-stage ${panelVisible ? 'visible' : ''} mode-${panelMode} ${phase === 'capture' ? 'is-capturing' : ''}`}
        aria-live="polite"
      >
        <div className="cart-stage-glow"></div>
        <div className="cart-stage-slot">
          <div className="cart-stage-pocket">
            <div className="cart-stage-mouth">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className={`cart-stage-book-mini ${dragSession ? 'dragging' : ''} ${cartNotice ? 'docked' : ''}`}>
              {stageImage ? (
                <img src={stageImage} alt={stageBook?.title || 'Book cover'} draggable={false} />
              ) : (
                <div className="cart-stage-book-mini-fallback"></div>
              )}
            </div>
            <div className="cart-stage-pocket-core">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="9" cy="19" r="1.8" />
                <circle cx="17" cy="19" r="1.8" />
                <path d="M3 4h2l2.2 9.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.78L21 7H7.4" />
              </svg>
              <span className="cart-stage-count">{getCartCount()}</span>
            </div>
          </div>

          <div className="cart-stage-copy">
            <p className="cart-stage-kicker">
              {dragSession ? 'Lift And Drop' : cartNotice ? 'Book Filed' : 'Reading Basket'}
            </p>
            <h3>{panelTitle}</h3>
            <p>{panelSubtitle}</p>
          </div>

          <Link to="/cart" className="cart-stage-link">
            Open Cart
          </Link>
        </div>
      </aside>

      {previewBook ? (
        <div className={`cart-drag-preview phase-${phase} ${isOverTarget ? 'over-target' : ''}`} style={previewStyle}>
          <div className="cart-drag-shadow"></div>
          <div className="cart-drag-book">
            <div className="cart-drag-spine"></div>
            <div className="cart-drag-cover">
              {previewImage ? (
                <img src={previewImage} alt={previewBook.title} draggable={false} />
              ) : (
                <div className="cart-drag-fallback-cover"></div>
              )}
              <div className="cart-drag-overlay"></div>
              <div className="cart-drag-meta">
                <span>{previewCategory}</span>
                <strong>{previewBook.title}</strong>
                <small>{previewAuthor}</small>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default CartDropZone;
