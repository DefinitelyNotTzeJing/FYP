import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";

// ── Profile ────────────────────────────────────────────────────────────────

export function useProfile(token) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch_ = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiFetch("/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => { setProfile(d.data); setLoading(false); })
      .catch(() => { setError("Failed to load profile."); setLoading(false); });
  }, [token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function updateProfile(payload) {
    try {
      const data = await apiFetch("/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      fetch_();
      return data;
    } catch (e) {
      console.error("[updateProfile] error:", e?.response || e?.message || e);
      throw e;
    }
  }

  return { profile, loading, error, updateProfile, refresh: fetch_ };
}

// ── Wishlist ───────────────────────────────────────────────────────────────

export function useWishlist(token) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiFetch("/wishlist", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => { setItems(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function add(bookId) {
    try {
      await apiFetch("/wishlist", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ book_id: bookId }),
      });
      fetch_();
    } catch (e) {
      if (e?.response?.error === "Book already in wishlist") return;
      throw e;
    }
  }

  async function remove(bookId) {
    await apiFetch(`/wishlist/${bookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems((prev) => prev.filter((i) => i.book?.book_id !== bookId && i.book_id !== bookId));
  }

  async function clear() {
    await apiFetch("/wishlist", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems([]);
  }

  async function check(bookId) {
    try {
      const data = await apiFetch(`/wishlist/check/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data.in_wishlist;
    } catch {
      return false;
    }
  }

  return { items, loading, add, remove, clear, check, refresh: fetch_ };
}

// ── Cart ───────────────────────────────────────────────────────────────────

export function useCart(token) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiFetch("/cart", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => { setItems(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function add(bookId, quantity = 1) {
    await apiFetch("/cart", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ book_id: bookId, quantity }),
    });
    fetch_();
  }

  async function update(bookId, quantity) {
    await apiFetch(`/cart/${bookId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity }),
    });
    fetch_();
  }

  async function remove(bookId) {
    await apiFetch(`/cart/${bookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems((prev) => prev.filter((i) => i.book?.book_id !== bookId && i.book_id !== bookId));
  }

  async function clear() {
    await apiFetch("/cart", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems([]);
  }

  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return { items, loading, add, update, remove, clear, totalQty, refresh: fetch_ };
}

// ── Orders ─────────────────────────────────────────────────────────────────

export function useOrders(token) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    if (!token) return;
    apiFetch("/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => { setOrders(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { orders, loading, refresh: fetch_ };
}

// ── My Reviews ─────────────────────────────────────────────────────────────

export function useMyReviews(token) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    if (!token) return;
    apiFetch("/my-reviews", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => { setReviews(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { reviews, loading, refresh: fetch_ };
}