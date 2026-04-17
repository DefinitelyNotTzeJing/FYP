import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
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
                <button className="pagination__btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1} aria-label="Previous page">‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                  return (
                    <button key={p} className={`pagination__btn${page === p ? " pagination__btn--active" : ""}`} onClick={() => setPage(p)} aria-label={`Page ${p}`} aria-current={page === p ? "page" : undefined}>{p}</button>
                  );
                })}
                <button className="pagination__btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} aria-label="Next page">›</button>
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
