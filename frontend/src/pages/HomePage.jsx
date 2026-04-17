import { useState, useEffect } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "../utils/api";
import Navbar from "../components/nav/Navbar";
import Sidebar from "../components/nav/Sidebar";
import BookCard from "../components/common/BookCard";
import BookModal from "../components/common/BookModal";
import FeaturedHero from "../components/common/FeaturedHero";
import FeaturedRow from "../components/common/FeaturedRow";
import { useBooks, useCategories } from "../hooks/useBooks";
import AuthorCard from "../components/common/AuthorCard";
import AuthorModal from "../components/common/AuthorModal";
import { useWishlist, useCart, useProfile } from "../hooks/useProfile";
import { useAuth } from "../context/AuthContext";
import "../styles/HomePage.css";
import "../styles/AuthorCard.css";
import "../styles/AuthorModal.css";

export default function HomePage({
  onNavigateHome,
  onNavigateToAuth,
  onNavigateToProfile,
  onNavigateToFaceLogin,
  onNavigateToWishlist,
  onNavigateToOrders,
  onNavigateToCart,
  onNavigateToReviews,
  onNavigateToAdmin, })
  {
  const { token } = useAuth();
  const { profile } = useProfile(token);
  const profileImage = profile?.profile?.profile_image_base64 || null;
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortValue, setSortValue] = useState("created_at__desc");
  const [page, setPage] = useState(1);
  const [selectedBook, setSelectedBook] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const [featuredBooks, setFeaturedBooks] = useState([]);

  const [sortBy, sortOrder] = sortValue.split("__");
  const categories = useCategories();
  const { books, pagination, loading, error } = useBooks({
    search, selectedCategory, sortBy, sortOrder, page,
  });

  const wishlistHook = useWishlist(token);
  const cartHook     = useCart(token);

  // Fetch featured books once for hero + row
  useEffect(() => {
    apiFetch("/books?sort_by=is_featured&sort_order=desc&per_page=12")
      .then((data) => {
        const featured = (data.data || []).filter((b) => b.is_featured);
        setFeaturedBooks(featured);
      })
      .catch(() => {});
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch matching authors when searching
  useEffect(() => {
    if (!search.trim()) { setAuthors([]); return; }
    apiFetch(`/authors?search=${encodeURIComponent(search)}&per_page=3`)
      .then((d) => setAuthors(d.data?.data || d.data || []))
      .catch(() => setAuthors([]));
  }, [search]);

  const handleCategory = (id) => { setSelectedCategory(id); setPage(1); };
  const handleSort     = (val) => { setSortValue(val); setPage(1); };
  const handleLogoClick = () => { setSearchInput(""); setSearch(""); setSelectedCategory(null); setPage(1); onNavigateHome?.(); };

  const executeCommand = async (input) => {
    const lower = input.toLowerCase().trim();

    // ── Navigation ──
    if (/\b(my cart|go to cart|open cart|checkout|check out)\b/.test(lower) && !/add/.test(lower)) {
      onNavigateToCart?.();
      return { ok: true, msg: "Opening your cart." };
    }
    if (/\b(wishlist|wish list)\b/.test(lower) && !/add/.test(lower)) {
      onNavigateToWishlist?.();
      return { ok: true, msg: "Opening your wishlist." };
    }
    if (/\b(orders?|my orders?|purchase history)\b/.test(lower)) {
      onNavigateToOrders?.();
      return { ok: true, msg: "Opening your orders." };
    }
    if (/face\s*(reg|login|register|recognition|id|face recog)|biometric/i.test(lower)) {
      onNavigateToFaceLogin?.();
      return { ok: true, msg: "Opening Face Login tab." };
    }
    if (/\b(edit profile|my profile|profile|account settings)\b/.test(lower)) {
      onNavigateToProfile?.();
      return { ok: true, msg: "Opening your profile." };
    }
    if (/\b(reviews?|my reviews?)\b/.test(lower)) {
      onNavigateToReviews?.();
      return { ok: true, msg: "Opening your reviews." };
    }
    if (/\b(home|go home|main page|back)\b/.test(lower)) {
      handleLogoClick();
      return { ok: true, msg: "Going home." };
    }
    if (/\b(admin|admin panel)\b/.test(lower)) {
      onNavigateToAdmin?.();
      return { ok: true, msg: "Opening admin panel." };
    }
    if (/\b(sign in|log in|login|sign up)\b/.test(lower)) {
      onNavigateToAuth?.();
      return { ok: true, msg: "Taking you to sign in." };
    }

    // ── Book actions ──
    const addCartMatch    = lower.match(/add (.+?) to (?:my )?cart/);
    const addWishMatch    = lower.match(/add (.+?) to (?:my )?wishlist/);
    const viewMatch       = lower.match(/(?:check|show|open|view|find|search(?: for)?|look up) (.+?)(?:\s+book)?$/i);

    if (addCartMatch || addWishMatch || viewMatch) {
      const query = ((addCartMatch || addWishMatch || viewMatch)[1])
        .replace(/\s+book$/i, "")
        .trim();

      let data;
      try {
        data = await apiFetch(`/books?search=${encodeURIComponent(query)}&per_page=5`);
      } catch {
        return { ok: false, msg: "Couldn't reach the server. Try again." };
      }

      const books = data.data || [];
      if (!books.length) return { ok: false, msg: `No book found matching "${query}".` };
      const book = books[0];

      if (addCartMatch) {
        if (!token) { onNavigateToAuth?.(); return { ok: false, msg: "Please sign in to add to cart." }; }
        if (book.available_quantity === 0) return { ok: false, msg: `"${book.book_name}" is out of stock.` };
        try {
          await cartHook.add(book.book_id);
          return { ok: true, msg: `"${book.book_name}" added to cart.` };
        } catch {
          return { ok: false, msg: "Could not add to cart." };
        }
      }

      if (addWishMatch) {
        if (!token) { onNavigateToAuth?.(); return { ok: false, msg: "Please sign in to add to wishlist." }; }
        try {
          const already = wishlistHook.items.some(
            (i) => (i.book?.book_id ?? i.book_id) === book.book_id
          );
          if (already) return { ok: true, msg: `"${book.book_name}" is already in your wishlist.` };
          await wishlistHook.add(book.book_id);
          return { ok: true, msg: `"${book.book_name}" added to wishlist.` };
        } catch {
          return { ok: false, msg: "Could not add to wishlist." };
        }
      }

      if (viewMatch) {
        setSelectedBook(book);
        return { ok: true, msg: `Showing "${book.book_name}".` };
      }
    }

    return {
      ok: false,
      msg: `Not sure what you mean. Try: "show Harry Potter", "add Dune to cart", "go to wishlist".`,
    };
  };

  const totalPages = pagination?.last_page || 1;
  const isDefaultView = !search && !selectedCategory;

  const pageTitle = search
    ? `"${search}"`
    : selectedCategory
    ? categories.find((c) => c.category_id === selectedCategory)?.name || "Books"
    : "All Books";

  return (
    <>
      <Navbar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onLogoClick={handleLogoClick}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToProfile={onNavigateToProfile}
        cartCount={cartHook.totalQty}
        wishlistCount={wishlistHook.items.length}
        onNavigateToWishlist={onNavigateToWishlist}
        onNavigateToOrders={onNavigateToOrders}
        onNavigateToCart={onNavigateToCart}
        onNavigateToReviews={onNavigateToReviews}
        profileImage={profileImage}
        onNavigateHome={onNavigateHome}
      />

      <main className="home">
        {/* Hero — only on default view with featured books */}
        {isDefaultView && featuredBooks.length > 0 && (
          <FeaturedHero books={featuredBooks} onBookClick={setSelectedBook} />
        )}

        <div className="home__layout">
          <Sidebar
            onNavigateToAdmin={onNavigateToAdmin}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategory}
            sortValue={sortValue}
            onSortChange={handleSort}
            onCommand={executeCommand}
          />

          <div className="home__content">
            <div className="home__content-header">
              <h1 className="home__title">{pageTitle}</h1>
              {pagination && <span className="home__count">{pagination.total} books</span>}
            </div>

            {/* Featured row — only on default view */}
            {isDefaultView && featuredBooks.length > 0 && (
              <FeaturedRow books={featuredBooks} onBookClick={setSelectedBook} />
            )}

            {/* Author results — only shown when searching */}
            {search && authors.length > 0 && (
              <div className="author-results">
                <h2 className="author-results__title">Authors</h2>
                <div className="author-results__list">
                  {authors.map((a) => (
                    <AuthorCard key={a.author_id} author={a} onClick={setSelectedAuthor} />
                  ))}
                </div>
              </div>
            )}

            {error && <div className="state-error"><AlertTriangle size={16} /> {error}</div>}

            {loading ? (
              <div className="book-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="book-card book-card--skeleton">
                    <div className="book-card__cover" />
                    <div className="book-card__info">
                      <div className="book-card__title">&nbsp;</div>
                      <div className="book-card__author">&nbsp;</div>
                      <div className="book-card__footer">
                        <span className="book-card__price">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className="state-empty">
                <div className="state-empty__title">No books found</div>
                <div>Try a different search or category.</div>
              </div>
            ) : (
              <div className="book-grid">
                {books.map((book, i) => (
                  <BookCard key={book.book_id} book={book} onClick={setSelectedBook} index={i} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="pagination">
                <button className="pagination__btn pagination__btn--nav" onClick={() => setPage((p) => p - 1)} disabled={page === 1} aria-label="Previous page">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                  return (
                    <button key={p} className={`pagination__btn${page === p ? " pagination__btn--active" : ""}`} onClick={() => setPage(p)} aria-label={`Page ${p}`} aria-current={page === p ? "page" : undefined}>{p}</button>
                  );
                })}
                <button className="pagination__btn pagination__btn--nav" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} aria-label="Next page">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedAuthor && (
        <AuthorModal
          author={selectedAuthor}
          onClose={() => setSelectedAuthor(null)}
          onBookClick={setSelectedBook}
        />
      )}

      {selectedBook && (
        <BookModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onRequireAuth={onNavigateToAuth}
          wishlistHook={wishlistHook}
          cartHook={cartHook}
        />
      )}
    </>
  );
}
