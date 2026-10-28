import apiClient from './client';

export const studentsApi = {
  async getStudents(params = {}) {
    const res = await apiClient.get('/students', { params });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getStudentById(id) {
    const res = await apiClient.get(`/students/${id}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async createStudent(payload) {
    const res = await apiClient.post('/students', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async updateStudent(id, payload) {
    const res = await apiClient.put(`/students/${id}`, payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async activateStudent(id) {
    try {
      const res = await apiClient.post(`/students/${id}/activate`);
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch {
      const fallback = await apiClient.patch(`/students/${id}/status`, { status: 'ACTIVE' });
      return fallback.data?.data !== undefined ? fallback.data.data : fallback.data;
    }
  },

  async deactivateStudent(id, reason = '') {
    try {
      const res = await apiClient.post(`/students/${id}/deactivate`, { reason });
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch {
      const fallback = await apiClient.patch(`/students/${id}/status`, { status: 'INACTIVE', reason });
      return fallback.data?.data !== undefined ? fallback.data.data : fallback.data;
    }
  },

  async updateFeeGroup(id, feeGroupId) {
    const res = await apiClient.patch(`/students/${id}/fee-group`, { feeGroupId });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async resetPassword(id, password) {
    const res = await apiClient.post(`/students/${id}/reset-password`, { password });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async toggleLoginAccess(id, enabled) {
    const res = await apiClient.patch(`/students/${id}/toggle-login`, { enabled });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getStudentLedger(id, params = {}) {
    const res = await apiClient.get(`/students/${id}/ledger`, { params });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getFormerStudents(params = {}) {
    try {
      const res = await apiClient.get('/students/former', { params });
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch {
      const res = await apiClient.get('/students', {
        params: { ...params, status: 'INACTIVE', duesOnly: true },
      });
      return res.data?.data !== undefined ? res.data.data : res.data;
    }
  },

  // Student portal endpoints
  async getMyProfile() {
    try {
      const res = await apiClient.get('/me/profile');
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch {
      const fallback = await apiClient.get('/me');
      return fallback.data?.data !== undefined ? fallback.data.data : fallback.data;
    }
  },

  async getMyStatement() {
    try {
      const res = await apiClient.get('/me/statement');
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch {
      const fallback = await apiClient.get('/me/profile');
      return fallback.data?.data !== undefined ? fallback.data.data : fallback.data;
    }
  },

  async getMyLedger(params = {}) {
    try {
      const res = await apiClient.get('/me/ledger', { params });
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch {
      const fallback = await apiClient.get('/me/transactions', { params });
      return fallback.data?.data !== undefined ? fallback.data.data : fallback.data;
    }
  },
};

export const getStudents = (...args) => studentsApi.getStudents(...args);
export const getStudentById = (...args) => studentsApi.getStudentById(...args);
export const createStudent = (...args) => studentsApi.createStudent(...args);
export const updateStudent = (...args) => studentsApi.updateStudent(...args);
export const activateStudent = (...args) => studentsApi.activateStudent(...args);
export const deactivateStudent = (...args) => studentsApi.deactivateStudent(...args);
export const updateFeeGroup = (...args) => studentsApi.updateFeeGroup(...args);
export const resetPassword = (...args) => studentsApi.resetPassword(...args);
export const toggleLoginAccess = (...args) => studentsApi.toggleLoginAccess(...args);
export const getStudentLedger = (...args) => studentsApi.getStudentLedger(...args);
export const getFormerStudents = (...args) => studentsApi.getFormerStudents(...args);
export const getMyProfile = (...args) => studentsApi.getMyProfile(...args);
export const getMyStatement = (...args) => studentsApi.getMyStatement(...args);
export const getMyLedger = (...args) => studentsApi.getMyLedger(...args);

export default studentsApi;
