import api from './AxiosConfig';

export const bookService = {
  // Get all books with optional filters
  getBooks: async (params = {}) => {
    try {
      const response = await api.get('/books', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get single book by ID
  getBook: async (id) => {
    try {
      const response = await api.get(`/books/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Search books
  searchBooks: async (query) => {
    try {
      const response = await api.get('/books/search', { 
        params: { q: query } 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get books by category
  getBooksByCategory: async (category) => {
    try {
      const response = await api.get(`/books/category/${category}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Create book
  createBook: async (bookData) => {
    try {
      const response = await api.post('/books', bookData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Update book
  updateBook: async (id, bookData) => {
    try {
      const response = await api.put(`/books/${id}`, bookData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Delete book
  deleteBook: async (id) => {
    try {
      const response = await api.delete(`/books/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};