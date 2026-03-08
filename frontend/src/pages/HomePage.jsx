import { useState, useEffect } from "react";
import Navbar from "../components/nav/Navbar";
import Sidebar from "../components/nav/Sidebar";
import BookCard from "../components/common/BookCard";
import BookModal from "../components/common/BookModal";
import { useBooks, useCategories } from "../hooks/useBooks";
import { useWishlist, useCart, useProfile } from "../hooks/useProfile";
import { useAuth } from "../context/AuthContext";
import "../styles/HomePage.css";

export default function HomePage({ onNavigateHome, onNavigateToAuth, onNavigateToProfile, onNavigateToWishlist, onNavigateToOrders, onNavigateToCart, onNavigateToReviews }) {
  const { token } = useAuth();
  const { profile } = useProfile(token);
  const profileImage = profile?.profile?.profile_image_base64 || null;
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortValue, setSortValue] = useState("created_at__desc");
  const [page, setPage] = useState(1);
  const [selectedBook, setSelectedBook] = useState(null);

  const [sortBy, sortOrder] = sortValue.split("__");
  const categories = useCategories();
  const { books, pagination, loading, error } = useBooks({
    search, selectedCategory, sortBy, sortOrder, page,
  });

  const wishlistHook = useWishlist(token);
  const cartHook     = useCart(token);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleCategory = (id) => { setSelectedCategory(id); setPage(1); };
  const handleSort     = (val) => { setSortValue(val); setPage(1); };
  const handleLogoClick = () => { setSearchInput(""); setSearch(""); setSelectedCategory(null); setPage(1); onNavigateHome?.(); };

  const totalPages = pagination?.last_page || 1;

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
        <div className="home__layout">
          <Sidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategory}
            sortValue={sortValue}
            onSortChange={handleSort}
          />

          <div>
            <div className="home__content-header">
              <h1 className="home__title">{pageTitle}</h1>
              {pagination && <span className="home__count">{pagination.total} books</span>}
            </div>

            {error && <div className="state-error">⚠ {error}</div>}

            {loading ? (
              <div className="state-loading">Loading books…</div>
            ) : books.length === 0 ? (
              <div className="state-empty">
                <div className="state-empty__title">No books found</div>
                <div>Try a different search or category.</div>
              </div>
            ) : (
              <div className="book-grid">
                {books.map((book) => (
                  <BookCard key={book.book_id} book={book} onClick={setSelectedBook} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="pagination">
                <button className="pagination__btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                  return (
                    <button key={p} className={`pagination__btn${page === p ? " pagination__btn--active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                  );
                })}
                <button className="pagination__btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
              </div>
            )}
          </div>
        </div>
      </main>

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