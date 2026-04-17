import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import Navbar from "../../components/nav/Navbar";
import { useProfile } from "../../hooks/useProfile";

// ── Shared helpers ─────────────────────────────────────────────────────────

const S = {
  page:    { maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" },
  tabs:    { display: "flex", gap: "0.25rem", marginBottom: "2rem", borderBottom: "2px solid var(--border)", paddingBottom: "0" },
  tab:     (active) => ({
    padding: "0.6rem 1.25rem", border: "none", background: "none",
    fontFamily: "var(--font-display)", fontSize: "0.9rem", fontWeight: 600,
    cursor: "pointer", color: active ? "var(--ink)" : "var(--muted)",
    borderBottom: active ? "2px solid var(--ink)" : "2px solid transparent",
    marginBottom: "-2px", transition: "color 0.15s",
  }),
  card:    { background: "var(--white)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" },
  th:      { padding: "0.65rem 1rem", fontSize: "0.73rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", background: "var(--paper)", borderBottom: "1px solid var(--border)" },
  td:      { padding: "0.75rem 1rem", fontSize: "0.88rem", borderBottom: "1px solid var(--border)", verticalAlign: "middle" },
  btnPri:  { padding: "0.5rem 1.1rem", background: "var(--ink)", color: "white", border: "none", borderRadius: "7px", fontFamily: "var(--font-body)", fontSize: "0.83rem", fontWeight: 600, cursor: "pointer" },
  btnSec:  { padding: "0.45rem 0.9rem", background: "none", border: "1.5px solid var(--border)", borderRadius: "7px", fontFamily: "var(--font-body)", fontSize: "0.8rem", cursor: "pointer", color: "var(--ink)" },
  btnDang: { padding: "0.45rem 0.9rem", background: "none", border: "1.5px solid #fca5a5", borderRadius: "7px", fontFamily: "var(--font-body)", fontSize: "0.8rem", cursor: "pointer", color: "#dc2626" },
  input:   { width: "100%", padding: "0.55rem 0.8rem", border: "1.5px solid var(--border)", borderRadius: "7px", fontFamily: "var(--font-body)", fontSize: "0.88rem", background: "var(--white)", color: "var(--ink)", boxSizing: "border-box" },
  label:   { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.3rem" },
  row:     { display: "grid", gap: "0.85rem", marginBottom: "0.85rem" },
};

function Msg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ fontSize: "0.82rem", padding: "0.5rem 0.85rem", borderRadius: "6px", marginBottom: "0.85rem",
      color: msg.ok ? "#166534" : "#991b1b",
      background: msg.ok ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${msg.ok ? "#bbf7d0" : "#fecaca"}`,
    }}>{msg.text}</div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--white)", borderRadius: "12px", padding: "1.75rem", maxWidth: 380, width: "100%", margin: "1rem", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>Confirm Delete</div>
        <div style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.5rem" }}>{message}</div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button style={S.btnSec} onClick={onCancel}>Cancel</button>
          <button style={{ ...S.btnPri, background: "#dc2626" }} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Search bar ─────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", maxWidth: 320 }}>
      <span style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>⌕</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...S.input, paddingLeft: "2rem" }} />
    </div>
  );
}


// ── AuthorCombobox ─────────────────────────────────────────────────────────
function AuthorCombobox({ authors, value, onChange }) {
  // value = author_id (number/string), onChange(id, name)
  const selected   = authors.find((a) => String(a.author_id) === String(value));
  const [input, setInput]   = useState(selected?.name || "");
  const [open, setOpen]     = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef();

  // Sync input text when form is reset or populated (edit mode)
  useEffect(() => {
    setInput(selected?.name || "");
  }, [value]); // eslint-disable-line

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
        // If user typed but didn't pick, revert to last valid selection
        if (!selected) setInput("");
        else setInput(selected.name);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selected]);

  const filtered = input.trim()
    ? authors.filter((a) => a.name.toLowerCase().includes(input.toLowerCase()))
    : authors;

  function pick(author) {
    onChange(author.author_id, author.name);
    setInput(author.name);
    setOpen(false);
  }

  function handleInput(e) {
    setInput(e.target.value);
    setOpen(true);
    // If cleared, unset author_id
    if (!e.target.value) onChange("", "");
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        style={{
          ...S.input,
          borderColor: open && focused ? "var(--ink)" : "var(--border)",
        }}
        value={input}
        onChange={handleInput}
        onFocus={() => { setFocused(true); setOpen(true); }}
        placeholder="Type to search authors…"
        autoComplete="off"
      />
      {/* Selected badge */}
      {selected && String(selected.author_id) === String(value) && (
        <span style={{
          position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)",
          fontSize: "0.7rem", background: "var(--paper)", color: "var(--muted)",
          padding: "1px 6px", borderRadius: "4px", pointerEvents: "none",
        }}>✓</span>
      )}
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", zIndex: 100, top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)", maxHeight: 220, overflowY: "auto",
        }}>
          {filtered.map((a) => (
            <div
              key={a.author_id}
              onMouseDown={(e) => { e.preventDefault(); pick(a); }}
              style={{
                padding: "0.55rem 0.85rem", fontSize: "0.87rem", cursor: "pointer",
                background: String(a.author_id) === String(value) ? "var(--paper)" : "transparent",
                fontWeight: String(a.author_id) === String(value) ? 600 : 400,
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper)"}
              onMouseLeave={(e) => e.currentTarget.style.background = String(a.author_id) === String(value) ? "var(--paper)" : "transparent"}
            >
              <span style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", background: "var(--paper-dark)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "var(--muted)", flexShrink: 0 }}>
                {a.image_url
                  ? <img src={a.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : a.name?.slice(0, 2)
                }
              </span>
              {a.name}
              {String(a.author_id) === String(value) && <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.75rem" }}>✓</span>}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "0.65rem 0.85rem", fontSize: "0.85rem", color: "var(--muted)" }}>No authors found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── BOOKS TAB ──────────────────────────────────────────────────────────────
function BooksTab({ token }) {
  const [books, setBooks]       = useState([]);
  const [authors, setAuthors]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [form, setForm]         = useState(null);   // null | {} | {book_id,...}
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState(null);

  const load = useCallback((p = 1, q = "") => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: 10, page: p });
    if (q) params.set("search", q);
    apiFetch(`/books?${params}`)
      .then((d) => { setBooks(d.data || []); setPagination(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => {
    apiFetch("/authors?per_page=100").then((d) => setAuthors(d.data?.data || d.data || []));
    apiFetch("/categories").then((d) => setCategories(d.data || []));
  }, []);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(1, search); }, 400); return () => clearTimeout(t); }, [search]); // eslint-disable-line

  const blank = { book_name: "", book_description: "", author_id: "", category_id: "", price: "", available_quantity: "", cover_image_url: "", is_featured: false };

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const payload = { ...form, price: parseFloat(form.price), available_quantity: parseInt(form.available_quantity) };
      if (form.book_id) {
        await apiFetch(`/books/${form.book_id}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
        setMsg({ ok: true, text: "Book updated." });
      } else {
        await apiFetch("/books", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
        setMsg({ ok: true, text: "Book created." });
      }
      setForm(null); load(page, search);
    } catch (e) {
      const errs = e?.response?.details;
      setMsg({ ok: false, text: errs ? Object.values(errs).flat().join(" ") : e?.response?.error || "Failed to save." });
    }
    setSaving(false);
  }

  async function del(id) {
    await apiFetch(`/books/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setConfirm(null); load(page, search);
  }

  const totalPages = pagination?.last_page || 1;
  const f = form || {};

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: "1rem", flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search books…" />
        <button style={S.btnPri} onClick={() => { setForm(blank); setMsg(null); }}>+ Add Book</button>
      </div>

      {/* Form */}
      {form && (
        <div style={{ ...S.card, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "1rem" }}>
            {form.book_id ? "Edit Book" : "New Book"}
          </div>
          <Msg msg={msg} />
          <div style={{ ...S.row, gridTemplateColumns: "1fr 1fr" }}>
            <div><label style={S.label}>Title *</label><input style={S.input} value={f.book_name || ""} onChange={(e) => setForm({ ...f, book_name: e.target.value })} /></div>
            <div><label style={S.label}>Price (RM) *</label><input style={S.input} type="number" min="0" step="0.01" value={f.price || ""} onChange={(e) => setForm({ ...f, price: e.target.value })} /></div>
          </div>
          <div style={{ ...S.row, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={S.label}>Author *</label>
              <AuthorCombobox
                authors={authors}
                value={f.author_id || ""}
                onChange={(id) => setForm({ ...f, author_id: id })}
              />
            </div>
            <div>
              <label style={S.label}>Category *</label>
              <select style={S.input} value={f.category_id || ""} onChange={(e) => setForm({ ...f, category_id: e.target.value })}>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ ...S.row, gridTemplateColumns: "1fr 1fr" }}>
            <div><label style={S.label}>Stock *</label><input style={S.input} type="number" min="0" value={f.available_quantity || ""} onChange={(e) => setForm({ ...f, available_quantity: e.target.value })} /></div>
            <div><label style={S.label}>Cover Image URL</label><input style={S.input} value={f.cover_image_url || ""} onChange={(e) => setForm({ ...f, cover_image_url: e.target.value })} placeholder="https://…" /></div>
          </div>
          <div style={{ marginBottom: "0.85rem" }}>
            <label style={S.label}>Description</label>
            <textarea style={{ ...S.input, resize: "vertical" }} rows={3} value={f.book_description || ""} onChange={(e) => setForm({ ...f, book_description: e.target.value })} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer", marginBottom: "1rem" }}>
            <input type="checkbox" checked={!!f.is_featured} onChange={(e) => setForm({ ...f, is_featured: e.target.checked })} />
            Featured book
          </label>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={S.btnPri} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button style={S.btnSec} onClick={() => { setForm(null); setMsg(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={S.card}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Cover", "Title", "Author", "Category", "Price", "Stock", "Featured", ""].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.book_id} style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                  <td style={S.td}>
                    <div style={{ width: 36, height: 48, borderRadius: "3px", overflow: "hidden", background: "var(--paper-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "var(--muted)" }}>
                      {b.cover_image_url ? <img src={b.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : b.book_name?.slice(0, 2)}
                    </div>
                  </td>
                  <td style={{ ...S.td, fontWeight: 600, maxWidth: 200 }}>{b.book_name}</td>
                  <td style={{ ...S.td, color: "var(--muted)" }}>{b.author?.name}</td>
                  <td style={{ ...S.td, color: "var(--muted)" }}>{b.category?.name}</td>
                  <td style={S.td}>RM {parseFloat(b.price).toFixed(2)}</td>
                  <td style={S.td}>{b.available_quantity}</td>
                  <td style={S.td}>{b.is_featured ? "⭐" : "—"}</td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button style={S.btnSec} onClick={() => { setForm({ ...b, author_id: b.author?.author_id, category_id: b.category?.category_id }); setMsg(null); }}>Edit</button>
                      <button style={S.btnDang} onClick={() => setConfirm({ id: b.book_id, name: b.book_name })}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", marginTop: "1.25rem" }}>
          <button style={S.btnSec} disabled={page === 1} onClick={() => { setPage(page - 1); load(page - 1, search); }}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} style={{ ...S.btnSec, background: p === page ? "var(--ink)" : "none", color: p === page ? "white" : "var(--ink)", borderColor: p === page ? "var(--ink)" : "var(--border)" }}
              onClick={() => { setPage(p); load(p, search); }}>{p}</button>
          ))}
          <button style={S.btnSec} disabled={page === totalPages} onClick={() => { setPage(page + 1); load(page + 1, search); }}>›</button>
        </div>
      )}

      {confirm && <ConfirmModal message={`Delete "${confirm.name}"? This cannot be undone.`} onConfirm={() => del(confirm.id)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── AUTHORS TAB ────────────────────────────────────────────────────────────
function AuthorsTab({ token }) {
  const [authors, setAuthors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [form, setForm]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [confirm, setConfirm]   = useState(null);

  const load = useCallback((q = "") => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: 100 });
    if (q) params.set("search", q);
    apiFetch(`/authors?${params}`)
      .then((d) => { setAuthors(d.data?.data || d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => load(search), 400); return () => clearTimeout(t); }, [search]); // eslint-disable-line

  const blank = { name: "", bio: "", image_url: "" };

  async function save() {
    setSaving(true); setMsg(null);
    try {
      if (form.author_id) {
        await apiFetch(`/authors/${form.author_id}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
        setMsg({ ok: true, text: "Author updated." });
      } else {
        await apiFetch("/authors", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
        setMsg({ ok: true, text: "Author created." });
      }
      setForm(null); load(search);
    } catch (e) {
      const errs = e?.response?.details;
      setMsg({ ok: false, text: errs ? Object.values(errs).flat().join(" ") : e?.response?.error || "Failed to save." });
    }
    setSaving(false);
  }

  async function del(id) {
    try {
      await apiFetch(`/authors/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.message || "Cannot delete author." });
    }
    setConfirm(null); load(search);
  }

  const f = form || {};

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: "1rem", flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search authors…" />
        <button style={S.btnPri} onClick={() => { setForm(blank); setMsg(null); }}>+ Add Author</button>
      </div>

      {form && (
        <div style={{ ...S.card, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "1rem" }}>
            {form.author_id ? "Edit Author" : "New Author"}
          </div>
          <Msg msg={msg} />
          <div style={{ ...S.row, gridTemplateColumns: "1fr 1fr" }}>
            <div><label style={S.label}>Name *</label><input style={S.input} value={f.name || ""} onChange={(e) => setForm({ ...f, name: e.target.value })} /></div>
            <div><label style={S.label}>Image URL</label><input style={S.input} value={f.image_url || ""} onChange={(e) => setForm({ ...f, image_url: e.target.value })} placeholder="https://…" /></div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={S.label}>Bio</label>
            <textarea style={{ ...S.input, resize: "vertical" }} rows={3} value={f.bio || ""} onChange={(e) => setForm({ ...f, bio: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={S.btnPri} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button style={S.btnSec} onClick={() => { setForm(null); setMsg(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={S.card}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Photo", "Name", "Bio", ""].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {authors.map((a) => (
                <tr key={a.author_id}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                  <td style={S.td}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "var(--paper-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "var(--muted)" }}>
                      {a.image_url ? <img src={a.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : a.name?.slice(0, 2)}
                    </div>
                  </td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{a.name}</td>
                  <td style={{ ...S.td, color: "var(--muted)", maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.bio || "—"}</td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button style={S.btnSec} onClick={() => { setForm(a); setMsg(null); }}>Edit</button>
                      <button style={S.btnDang} onClick={() => setConfirm({ id: a.author_id, name: a.name })}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirm && <ConfirmModal message={`Delete "${confirm.name}"? Authors with books cannot be deleted.`} onConfirm={() => del(confirm.id)} onCancel={() => setConfirm(null)} />}
      {msg && !form && <Msg msg={msg} />}
    </div>
  );
}

// ── CATEGORIES TAB ─────────────────────────────────────────────────────────
function CategoriesTab({ token }) {
  const [cats, setCats]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [form, setForm]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [confirm, setConfirm]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/categories")
      .then((d) => { setCats(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = { name: "", description: "" };
  const filtered = cats.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  async function save() {
    setSaving(true); setMsg(null);
    try {
      if (form.category_id) {
        await apiFetch(`/categories/${form.category_id}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
        setMsg({ ok: true, text: "Category updated." });
      } else {
        await apiFetch("/categories", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
        setMsg({ ok: true, text: "Category created." });
      }
      setForm(null); load();
    } catch (e) {
      const errs = e?.response?.details;
      setMsg({ ok: false, text: errs ? Object.values(errs).flat().join(" ") : e?.response?.error || "Failed to save." });
    }
    setSaving(false);
  }

  async function del(id) {
    try {
      await apiFetch(`/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.message || "Cannot delete category." });
    }
    setConfirm(null); load();
  }

  const f = form || {};

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: "1rem", flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search categories…" />
        <button style={S.btnPri} onClick={() => { setForm(blank); setMsg(null); }}>+ Add Category</button>
      </div>

      {form && (
        <div style={{ ...S.card, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "1rem" }}>
            {form.category_id ? "Edit Category" : "New Category"}
          </div>
          <Msg msg={msg} />
          <div style={{ marginBottom: "0.85rem" }}>
            <label style={S.label}>Name *</label>
            <input style={S.input} value={f.name || ""} onChange={(e) => setForm({ ...f, name: e.target.value })} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={S.label}>Description</label>
            <textarea style={{ ...S.input, resize: "vertical" }} rows={2} value={f.description || ""} onChange={(e) => setForm({ ...f, description: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={S.btnPri} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button style={S.btnSec} onClick={() => { setForm(null); setMsg(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={S.card}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Name", "Slug", "Description", ""].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.category_id}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.name}</td>
                  <td style={{ ...S.td, color: "var(--muted)", fontFamily: "monospace", fontSize: "0.8rem" }}>{c.slug}</td>
                  <td style={{ ...S.td, color: "var(--muted)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description || "—"}</td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button style={S.btnSec} onClick={() => { setForm(c); setMsg(null); }}>Edit</button>
                      <button style={S.btnDang} onClick={() => setConfirm({ id: c.category_id, name: c.name })}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirm && <ConfirmModal message={`Delete "${confirm.name}"? Categories with books cannot be deleted.`} onConfirm={() => del(confirm.id)} onCancel={() => setConfirm(null)} />}
      {msg && !form && <Msg msg={msg} />}
    </div>
  );
}

// ── Admin Orders Tab ───────────────────────────────────────────────────────
function AdminOrdersTab({ token }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [msg, setMsg]         = useState(null);
  const [updating, setUpdating] = useState(null);

  const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

  const statusColor = {
    pending:    "#854d0e", processing: "#1e40af", shipped: "#5b21b6",
    delivered:  "#166534", cancelled:  "#991b1b",
  };
  const statusBg = {
    pending:    "#fef9c3", processing: "#dbeafe", shipped: "#ede9fe",
    delivered:  "#dcfce7", cancelled:  "#fee2e2",
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (search.trim())    params.set("order_number", search.trim());
    apiFetch(`/admin/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => { setOrders(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, filter, search]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(orderId, status) {
    setUpdating(orderId);
    try {
      await apiFetch(`/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      setMsg({ ok: true, text: `Order #${orderId} marked as ${status}.` });
      load();
    } catch {
      setMsg({ ok: false, text: "Failed to update order status." });
    }
    setUpdating(null);
    setTimeout(() => setMsg(null), 2500);
  }

  // Summary counts
  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Summary chips */}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "all" : s)}
            style={{
              padding: "0.3rem 0.85rem", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: "0.78rem", fontWeight: 600,
              background: filter === s ? statusBg[s] : "var(--paper)",
              color: filter === s ? statusColor[s] : "var(--muted)",
              outline: filter === s ? `2px solid ${statusColor[s]}` : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {counts[s] ? <span style={{ marginLeft: 5, opacity: 0.7 }}>({counts[s]})</span> : null}
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...S.input, maxWidth: 260 }}
          placeholder="Search order number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Msg msg={msg} />

      <div style={S.card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Order #", "Customer", "Items", "Total", "Payment", "Status", "Date", "Change Status"].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "var(--muted)" }}>Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", color: "var(--muted)" }}>No orders found.</td></tr>
            ) : orders.map((o) => (
              <tr key={o.order_id} style={{ transition: "background 0.1s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--paper)"}
                onMouseLeave={(e) => e.currentTarget.style.background = ""}
              >
                <td style={{ ...S.td, fontWeight: 600 }}>{o.order_number}</td>
                <td style={S.td}>{o.user?.username || o.user_id}</td>
                <td style={{ ...S.td, maxWidth: 200 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {o.items?.map((i) => i.book?.book_name).filter(Boolean).join(", ") || "—"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{o.items?.length || 0} item(s)</div>
                </td>
                <td style={{ ...S.td, fontWeight: 600 }}>RM {parseFloat(o.total_amount).toFixed(2)}</td>
                <td style={S.td}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                    background: o.payment_status === "paid" ? "#dcfce7" : "#fef9c3",
                    color: o.payment_status === "paid" ? "#166534" : "#854d0e" }}>
                    {o.payment_status}
                  </span>
                </td>
                <td style={S.td}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                    background: statusBg[o.status] || "#f1f5f9",
                    color: statusColor[o.status] || "var(--muted)" }}>
                    {o.status}
                  </span>
                </td>
                <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                  {new Date(o.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td style={S.td}>
                  <select
                    value={o.status}
                    disabled={updating === o.order_id}
                    onChange={(e) => changeStatus(o.order_id, e.target.value)}
                    style={{ ...S.input, width: "auto", padding: "0.3rem 0.5rem", fontSize: "0.78rem",
                      borderColor: statusColor[o.status], color: statusColor[o.status],
                      background: statusBg[o.status], fontWeight: 600 }}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Admin PreordersTab ─────────────────────────────────────────────────────
function AdminPreordersTab({ token }) {
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [msg, setMsg]             = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/admin/preorders${filter !== "all" ? `?status=${filter}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((d) => { setPreorders(d.data?.data || d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    try {
      await apiFetch(`/admin/preorders/${id}/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      setMsg({ ok: true, text: `Marked as ${status}.` });
      load();
    } catch {
      setMsg({ ok: false, text: "Failed to update status." });
    }
    setTimeout(() => setMsg(null), 2500);
  }

  const statusColor = { pending: "#854d0e", cancelled: "#991b1b", fulfilled: "#166534" };
  const statusBg    = { pending: "#fef9c3", cancelled: "#fee2e2", fulfilled: "#dcfce7" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem" }}>Pre-orders</div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...S.input, width: "auto", padding: "0.35rem 0.6rem" }}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <Msg msg={msg} />
      <div style={S.card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["ID", "User", "Book", "Price", "Status", "Date", "Actions"].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "var(--muted)" }}>Loading…</td></tr>
            ) : preorders.length === 0 ? (
              <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "var(--muted)" }}>No pre-orders found.</td></tr>
            ) : preorders.map((p) => (
              <tr key={p.preorder_id}>
                <td style={S.td}>#{p.preorder_id}</td>
                <td style={S.td}>{p.user?.username || p.user_id}</td>
                <td style={S.td}>{p.book?.book_name || p.book_id}</td>
                <td style={S.td}>RM {parseFloat(p.price_at_preorder).toFixed(2)}</td>
                <td style={S.td}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: statusBg[p.status], color: statusColor[p.status] }}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </td>
                <td style={S.td}>{new Date(p.created_at).toLocaleDateString("en-MY")}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {p.status === "pending" && (
                      <>
                        <button style={{ ...S.btnSec, fontSize: "0.75rem", padding: "0.3rem 0.65rem" }} onClick={() => updateStatus(p.preorder_id, "fulfilled")}>Fulfill</button>
                        <button style={{ ...S.btnDang, fontSize: "0.75rem", padding: "0.3rem 0.65rem" }} onClick={() => updateStatus(p.preorder_id, "cancelled")}>Cancel</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main AdminPage ─────────────────────────────────────────────────────────
export default function AdminPage({
  onNavigateHome, onNavigateToAuth, onNavigateToProfile,
  onNavigateToWishlist, onNavigateToOrders, onNavigateToCart, onNavigateToReviews, onNavigateToPreorders,
}) {
  const { user, token } = useAuth();
  const { profile } = useProfile(token);
  const profileImage = profile?.profile?.profile_image_base64 || null;
  const [tab, setTab] = useState("books");

  // Guard: non-admins see a blank forbidden page
  if (!user?.is_admin) {
    return (
      <>
        <Navbar onLogoClick={onNavigateHome} onNavigateToAuth={onNavigateToAuth}
          onNavigateToProfile={onNavigateToProfile} onNavigateToWishlist={onNavigateToWishlist}
          onNavigateToOrders={onNavigateToOrders} onNavigateToCart={onNavigateToCart}
          onNavigateToReviews={onNavigateToReviews} onNavigateToPreorders={onNavigateToPreorders} profileImage={profileImage}
          onNavigateHome={onNavigateHome} />
        <div style={{ textAlign: "center", padding: "6rem 2rem", color: "var(--muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚫</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--ink)" }}>Admin access required</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar onLogoClick={onNavigateHome} onNavigateToAuth={onNavigateToAuth}
        onNavigateToProfile={onNavigateToProfile} onNavigateToWishlist={onNavigateToWishlist}
        onNavigateToOrders={onNavigateToOrders} onNavigateToCart={onNavigateToCart}
        onNavigateToReviews={onNavigateToReviews} profileImage={profileImage}
        onNavigateHome={onNavigateHome} />

      <div style={S.page}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "1.75rem" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>
            Admin Panel
          </h1>
          <span style={{ fontSize: "0.75rem", background: "var(--ink)", color: "white", padding: "0.2rem 0.6rem", borderRadius: "20px", fontWeight: 600 }}>
            Admin
          </span>
        </div>

        <div style={S.tabs}>
          {[["books", "📚 Books"], ["authors", "✍️ Authors"], ["categories", "🏷️ Categories"], ["orders", "🧾 Orders"], ["preorders", "🔔 Pre-orders"]].map(([key, label]) => (
            <button key={key} style={S.tab(tab === key)} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>

        {tab === "books"      && <BooksTab             token={token} />}
        {tab === "authors"    && <AuthorsTab           token={token} />}
        {tab === "categories" && <CategoriesTab        token={token} />}
        {tab === "orders"     && <AdminOrdersTab       token={token} />}
        {tab === "preorders"  && <AdminPreordersTab    token={token} />}
      </div>
    </>
  );
}