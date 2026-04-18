import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";

export function useBooks({ search, selectedCategory, sortBy, sortOrder, page, showFeatured }) {
  const [books, setBooks]         = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchBooks = useCallback(() => {
    setLoading(true);
    setError(null);

    // "featured__desc" sorts all books with featured ones first
    const isFeaturedSort = sortBy === "featured";
    const params = new URLSearchParams({
      per_page: 15,
      page,
      sort_by: isFeaturedSort ? "is_featured" : sortBy,
      sort_order: "desc",
    });
    if (!isFeaturedSort) params.set("sort_order", sortOrder);
    if (search) {
      params.set("search", search);        // search by book title
      params.set("author", search);        // search by author name
    }
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