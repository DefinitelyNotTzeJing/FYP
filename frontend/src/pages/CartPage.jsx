import { useAuth } from "../context/AuthContext";
import Navbar from "../components/nav/Navbar";
import { useCart, useProfile } from "../hooks/useProfile";

export default function CartPage({ onNavigateHome, onNavigateToAuth, onNavigateToProfile, onNavigateToWishlist, onNavigateToOrders, onNavigateToCart, onNavigateToReviews, onNavigateToCheckout }) {
  const { token } = useAuth();
  const { items, loading, remove, update, clear, totalQty } = useCart(token);
  const { profile } = useProfile(token);
  const profileImage = profile?.profile?.profile_image_base64 || null;

  const total = items.reduce((sum, i) => {
    return sum + parseFloat(i.book?.price || 0) * (i.quantity || 1);
  }, 0);

  return (
    <>
      <Navbar
        onLogoClick={onNavigateHome}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToWishlist={onNavigateToWishlist}
        onNavigateToOrders={onNavigateToOrders}
        onNavigateToCart={onNavigateToCart}
        onNavigateToReviews={onNavigateToReviews}
        cartCount={totalQty}
        profileImage={profileImage}
        onNavigateHome={onNavigateHome}
      />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 2rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 600, marginBottom: "1.5rem" }}>
          My Cart
        </h1>

        {loading ? (
          <div style={{ color: "var(--muted)", padding: "3rem", textAlign: "center" }}>Loading cart…</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--muted)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--ink)", marginBottom: "0.5rem" }}>Your cart is empty</div>
            <div>Browse books and add them to your cart.</div>
            <button onClick={onNavigateHome} style={{ marginTop: "1.5rem", padding: "0.65rem 1.5rem", background: "var(--accent)", color: "white", border: "none", borderRadius: "8px", fontFamily: "var(--font-body)", fontSize: "0.9rem", cursor: "pointer" }}>
              Browse Books
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              {items.map((item) => {
                const book = item.book || {};
                const stock = book.available_quantity ?? 999;
                const atMax = item.quantity >= stock;

                return (
                  <div key={item.cart_id || book.book_id} style={{
                    display: "grid", gridTemplateColumns: "60px 1fr auto",
                    gap: "1rem", alignItems: "center",
                    background: "var(--white)", border: "1px solid var(--border)",
                    borderRadius: "10px", padding: "1rem 1.25rem",
                  }}>
                    {/* Cover */}
                    <div style={{ width: 60, height: 80, borderRadius: "4px", overflow: "hidden", background: "var(--paper-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--font-display)", textAlign: "center" }}>
                      {book.cover_image_url
                        ? <img src={book.cover_image_url} alt={book.book_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : book.book_name?.slice(0, 2)
                      }
                    </div>

                    {/* Info */}
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.2rem" }}>{book.book_name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.5rem" }}>{book.author?.name}</div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--accent)" }}>RM {parseFloat(book.price || 0).toFixed(2)}</div>
                      {atMax && (
                        <div style={{ fontSize: "0.75rem", color: "#c0392b", marginTop: "0.25rem" }}>
                          Max stock reached ({stock})
                        </div>
                      )}
                    </div>

                    {/* Qty + remove */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <button
                          onClick={() => item.quantity > 1 ? update(book.book_id, item.quantity - 1) : remove(book.book_id)}
                          style={{ width: 28, height: 28, border: "1.5px solid var(--border)", borderRadius: "6px", background: "none", cursor: "pointer", fontSize: "0.9rem" }}
                        >−</button>
                        <span style={{ minWidth: 20, textAlign: "center", fontSize: "0.9rem", fontWeight: 500 }}>{item.quantity}</span>
                        <button
                          onClick={() => !atMax && update(book.book_id, item.quantity + 1)}
                          disabled={atMax}
                          style={{ width: 28, height: 28, border: "1.5px solid var(--border)", borderRadius: "6px", background: "none", cursor: atMax ? "not-allowed" : "pointer", fontSize: "0.9rem", opacity: atMax ? 0.4 : 1 }}
                        >+</button>
                      </div>
                      <button onClick={() => remove(book.book_id)} style={{ background: "none", border: "none", fontSize: "0.78rem", color: "var(--muted)", cursor: "pointer", textDecoration: "underline" }}>
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem 1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
                <span>{totalQty} item{totalQty !== 1 ? "s" : ""}</span>
                <span>RM {total.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600, marginBottom: "1.25rem" }}>
                <span>Total</span>
                <span style={{ color: "var(--accent)" }}>RM {total.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={onNavigateToCheckout} style={{ flex: 1, padding: "0.75rem", background: "var(--accent)", color: "white", border: "none", borderRadius: "8px", fontFamily: "var(--font-body)", fontSize: "0.95rem", fontWeight: 500, cursor: "pointer" }}>
                  Checkout
                </button>
                <button onClick={clear} style={{ padding: "0.75rem 1rem", background: "none", border: "1.5px solid var(--border)", borderRadius: "8px", fontFamily: "var(--font-body)", fontSize: "0.88rem", cursor: "pointer", color: "var(--muted)" }}>
                  Clear
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}