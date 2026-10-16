import apiClient from './client';

export const reportsApi = {
  async getDashboard() {
    const res = await apiClient.get('/reports/dashboard');
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getMonthlySummary(params = {}) {
    const res = await apiClient.get('/reports/monthly-summary', { params });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getOutstandingDues(params = {}) {
    const res = await apiClient.get('/reports/outstanding', { params });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getFeeGroupSummary() {
    const res = await apiClient.get('/reports/fee-group-summary');
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getCollectionReport(params = {}) {
    const res = await apiClient.get('/reports/collections', { params });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getStudentStatement(studentId, params = {}) {
    const res = await apiClient.get(`/reports/statement/${studentId}`, { params });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },
};

export default reportsApi;
