import api from './AxiosConfig';
import { normalizeBook, normalizePaginatedResponse } from '../utils/normalizers';

function normalizeBookQuery(params = {}) {
  const normalized = { ...params };

  if (normalized.limit !== undefined && normalized.per_page === undefined) {
    normalized.per_page = normalized.limit;
    delete normalized.limit;
  }

  if (normalized.sort && normalized.sort_by === undefined) {
    switch (normalized.sort) {
      case 'newest':
        normalized.sort_by = 'created_at';
        normalized.sort_order = 'desc';
        break;
      case 'oldest':
        normalized.sort_by = 'created_at';
        normalized.sort_order = 'asc';
        break;
      case 'price-low':
        normalized.sort_by = 'price';
        normalized.sort_order = 'asc';
        break;
      case 'price-high':
        normalized.sort_by = 'price';
        normalized.sort_order = 'desc';
        break;
      case 'title':
        normalized.sort_by = 'book_name';
        normalized.sort_order = 'asc';
        break;
      default:
        break;
    }

    delete normalized.sort;
  }

  return normalized;
}

export const bookService = {
  async getBooks(params = {}) {
    const response = await api.get('/books', { params: normalizeBookQuery(params) });
    return normalizePaginatedResponse(response.data, normalizeBook);
  },

  async getBook(id) {
    const response = await api.get(`/books/${id}`);
    return normalizeBook(response.data);
  },

  async searchBooks(query) {
    const response = await api.get('/books/search', {
      params: { query },
    });
    return normalizePaginatedResponse(response.data, normalizeBook);
  },

  async getBooksByCategory(category) {
    const response = await api.get(`/books/category/${category}`);
    return normalizePaginatedResponse(response.data, normalizeBook);
  },

  async createBook(bookData) {
    const response = await api.post('/books', bookData);
    return {
      ...response.data,
      book: response.data.book ? normalizeBook(response.data.book) : null,
    };
  },

  async updateBook(id, bookData) {
    const response = await api.put(`/books/${id}`, bookData);
    return {
      ...response.data,
      book: response.data.book ? normalizeBook(response.data.book) : null,
    };
  },

  async deleteBook(id) {
    const response = await api.delete(`/books/${id}`);
    return response.data;
  },
};
