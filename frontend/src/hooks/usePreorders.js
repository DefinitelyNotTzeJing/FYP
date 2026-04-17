import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";

export function usePreorders(token) {
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    apiFetch("/preorders", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => { setPreorders(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function add(bookId, quantity = 1) {
    await apiFetch("/preorders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ book_id: bookId, quantity }),
    });
    fetch_();
  }

  async function cancel(preorderId) {
    await apiFetch(`/preorders/${preorderId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setPreorders((prev) => prev.filter((p) => p.preorder_id !== preorderId));
  }

  function check(bookId) {
    return preorders.find(
      (p) => p.book_id === bookId && p.status === "pending"
    ) || null;
  }

  return { preorders, loading, add, cancel, check, refresh: fetch_ };
}
