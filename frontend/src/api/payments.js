import apiClient from './client';

export const paymentsApi = {
  async getPayments(params = {}) {
    const res = await apiClient.get('/payments', { params });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getPaymentById(id) {
    const res = await apiClient.get(`/payments/${id}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async recordPayment(payload) {
    const res = await apiClient.post('/payments', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async deletePayment(id) {
    const res = await apiClient.delete(`/payments/${id}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getReceipt(id) {
    try {
      const res = await apiClient.get(`/payments/${id}/receipt`);
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch {
      return this.getPaymentById(id);
    }
  },

  async getUnpaidPeriods(studentId) {
    try {
      const res = await apiClient.get(`/students/${studentId}/unpaid-periods`);
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch {
      return [];
    }
  },
};

export default paymentsApi;
