import apiClient from './client';

export const billingApi = {
  async getPreview(params) {
    const res = await apiClient.get('/billing/preview', { params });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async generateBilling(payload) {
    const res = await apiClient.post('/billing/generate', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getBillingHistory(params = {}) {
    try {
      const res = await apiClient.get('/billing/history', { params });
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch {
      const fallback = await apiClient.get('/billing', { params });
      return fallback.data?.data !== undefined ? fallback.data.data : fallback.data;
    }
  },

  async getBillingPeriod(id) {
    const res = await apiClient.get(`/billing/${id}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },
};

export default billingApi;
