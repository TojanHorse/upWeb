import axios from 'axios';

// Base URL for API calls from environment variables or fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error codes
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Unauthorized - redirect to login
          window.location.href = '/sign-in';
          break;
        case 403:
          // Forbidden - redirect to dashboard
          window.location.href = '/dashboard';
          break;
        default:
          // Handle other errors
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network Error:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const monitorApi = {
  getAll: () => api.get('/monitors'),
  getById: (id) => api.get(`/monitors/${id}`),
  create: (data) => api.post('/monitors', data),
  update: (id, data) => api.put(`/monitors/${id}`, data),
  delete: (id) => api.delete(`/monitors/${id}`),
  checkNow: (id) => api.post(`/monitors/${id}/check`),
  getHistory: (id) => api.get(`/monitors/${id}/history`),
  getStats: (id) => api.get(`/monitors/${id}/stats`),
};

export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getDashboard: () => api.get('/user/dashboard'),
};

export const contributorApi = {
  getProfile: () => api.get('/contributor/profile'),
  updateProfile: (data) => api.put('/contributor/profile', data),
  getDashboard: () => api.get('/contributor/dashboard'),
  getAssignedWebsites: () => api.get('/contributor/websites'),
  getEarnings: () => api.get('/contributor/earnings'),
  updateAvailability: (data) => api.put('/contributor/availability', data),
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getContributors: () => api.get('/admin/contributors'),
  getContributor: (id) => api.get(`/admin/contributors/${id}`),
  getAllMonitors: () => api.get('/admin/monitors'),
};

export const incidentApi = {
  getAll: () => api.get('/incidents'),
  getById: (id) => api.get(`/incidents/${id}`),
  resolve: (id, data) => api.put(`/incidents/${id}/resolve`, data),
};

export default api;