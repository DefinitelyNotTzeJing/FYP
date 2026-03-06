import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";

export function useBooks({ search, selectedCategory, sortBy, sortOrder, page }) {
  const [books, setBooks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBooks = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      per_page: 12,
      page,
      sort_by: sortBy,
      sort_order: sortOrder,
    });
    if (search) params.set("search", search);
    if (selectedCategory) params.set("category_id", selectedCategory);

    apiFetch(`/books?${params}`)
      .then((data) => {
        setBooks(data.data || []);
        setPagination(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not connect to the API. Make sure Laravel is running on port 8000.");
        setLoading(false);
      });
  }, [search, selectedCategory, sortBy, sortOrder, page]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  return { books, pagination, loading, error };
}

export function useCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    apiFetch("/categories")
      .then((data) => setCategories(data.data || []))
      .catch(() => {});
  }, []);

  return categories;
}