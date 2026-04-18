import api from './AxiosConfig';
import { normalizeOrder, normalizePaginatedResponse } from '../utils/normalizers';

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );
}

export const orderService = {
  async createOrder(orderData) {
    const response = await api.post('/orders', orderData);
    return {
      ...response.data,
      order: response.data.order ? normalizeOrder(response.data.order) : null,
    };
  },

  async getUserOrders() {
    const response = await api.get('/orders');
    return normalizePaginatedResponse(response.data, normalizeOrder);
  },

  async getOrder(id) {
    const response = await api.get(`/orders/${id}`);
    return normalizeOrder(response.data);
  },

  async getAllOrders(params = {}) {
    const response = await api.get('/admin/orders', { params: compactParams(params) });
    return normalizePaginatedResponse(response.data, normalizeOrder);
  },

  async updateOrderStatus(id, payload) {
    const response = await api.put(`/admin/orders/${id}/status`, payload);
    return {
      ...response.data,
      order: response.data.order ? normalizeOrder(response.data.order) : null,
    };
  },
};
