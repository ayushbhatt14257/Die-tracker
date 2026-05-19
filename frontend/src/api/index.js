import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://die-tracker-uowc.onrender.com/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dt_token');
      localStorage.removeItem('dt_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const dieAPI = {
  getAll: (params) => api.get('/dies', { params }),
  getOne: (id) => api.get(`/dies/${id}`),
  getStats: () => api.get('/dies/stats'),
  getMoulding: () => api.get('/dies/moulding'),
  create: (data) => api.post('/dies', data),
  advancePart: (dieId, partId, data) => api.post(`/dies/${dieId}/parts/${partId}/advance`, data),
  completeToolroom: (dieId, partId) => api.post(`/dies/${dieId}/parts/${partId}/complete-toolroom`),
  sendToMoulding: (dieId) => api.post(`/dies/${dieId}/send-to-moulding`),
  receiveAtGR1: (dieId) => api.post(`/dies/${dieId}/receive-gr1`),
  reportIssue: (dieId, partId, data) => api.post(`/dies/${dieId}/parts/${partId}/issues`, data),
  resolveIssue: (dieId, partId, issueId) => api.patch(`/dies/${dieId}/parts/${partId}/issues/${issueId}/resolve`),
};

export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getReport: (params) => api.get('/admin/report', { params }),
  getHolidays: () => api.get('/admin/holidays'),
  addHoliday: (data) => api.post('/admin/holidays', data),
  deleteHoliday: (id) => api.delete(`/admin/holidays/${id}`),
};

export default api;
