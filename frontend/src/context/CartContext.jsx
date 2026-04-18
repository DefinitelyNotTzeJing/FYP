import React, { createContext, useEffect, useRef, useState, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [dragSession, setDragSession] = useState(null);
  const [cartNotice, setCartNotice] = useState(null);
  const noticeTimeoutRef = useRef(null);

  const queueCartNotice = (book) => {
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
    }

    setCartNotice({
      id: book.id,
      title: book.title,
      author: book.author,
      imageUrl: book.imageUrl || book.fallbackImageUrl || '',
    });

    noticeTimeoutRef.current = window.setTimeout(() => {
      setCartNotice(null);
      noticeTimeoutRef.current = null;
    }, 2200);
  };

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  const addToCart = (book, quantity = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === book.id);

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === book.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prevCart, { ...book, quantity }];
    });
  };

  const removeFromCart = (bookId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== bookId));
  };

  const updateQuantity = (bookId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === bookId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const startDraggingBook = (book, dragMeta) => {
    setCartNotice(null);
    setDragSession({
      book,
      pointerX: dragMeta.pointerX,
      pointerY: dragMeta.pointerY,
      sourceRect: dragMeta.sourceRect || null,
    });
  };

  const finishDraggingBook = () => {
    setDragSession(null);
  };

  const dropDraggedBookToCart = (book = dragSession?.book) => {
    if (!book) {
      return false;
    }

    addToCart(book);
    queueCartNotice(book);
    setDragSession(null);
    return true;
  };

  const dismissCartNotice = () => {
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }

    setCartNotice(null);
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    dragSession,
    cartNotice,
    startDraggingBook,
    finishDraggingBook,
    dropDraggedBookToCart,
    dismissCartNotice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
