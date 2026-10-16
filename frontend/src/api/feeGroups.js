import apiClient from './client';

export const feeGroupsApi = {
  async getFeeGroups() {
    const res = await apiClient.get('/fee-groups');
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getFeeGroupById(id) {
    const res = await apiClient.get(`/fee-groups/${id}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async createFeeGroup(payload) {
    const res = await apiClient.post('/fee-groups', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async updateFeeGroup(id, payload) {
    const res = await apiClient.put(`/fee-groups/${id}`, payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async deleteFeeGroup(id) {
    const res = await apiClient.delete(`/fee-groups/${id}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getFeeGroupStudents(id) {
    const res = await apiClient.get(`/fee-groups/${id}/students`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },
};

export default feeGroupsApi;
