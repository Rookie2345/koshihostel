import apiClient from './client';

export const authApi = {
  async login(credentials) {
    const res = await apiClient.post('/auth/login', credentials);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async logout() {
    try {
      const res = await apiClient.post('/auth/logout');
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch {
      return { success: true };
    }
  },

  async refresh(refreshToken) {
    const res = await apiClient.post('/auth/refresh', { refreshToken });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async getMe() {
    const res = await apiClient.get('/auth/me');
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  async changePassword(passwords) {
    const res = await apiClient.post('/auth/change-password', passwords);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },
};

export default authApi;
