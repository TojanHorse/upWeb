import axios from 'axios';

// Base API instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API baseURL:', api.defaults.baseURL);

// Interceptors to handle tokens and errors
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    // Handle token expiration
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication service
export const authService = {
  login: async (email: string, password: string, role = 'user') => {
    const endpoint = role === 'admin' 
      ? '/admin/signin'
      : role === 'contributor' 
        ? '/contributor/signin' 
        : '/user/signin';
    
    return api.post(endpoint, { email, password });
  },
  
  register: async (name: string, email: string, password: string, role = 'user') => {
    const endpoint = role === 'contributor' 
      ? '/contributor/signup' 
      : '/user/signup';
    
    return api.post(endpoint, { name, email, password });
  },
  
  requestVerification: async () => {
    return api.post('/user/verify/request');
  },
  
  verifyEmail: async (code: string) => {
    return api.post('/user/verify/confirm', { code });
  },
};

// Monitor service
export const monitorService = {
  getAvailableMonitors: async () => {
    return api.get('/monitor/available');
  },
  
  getMonitorHistory: async () => {
    return api.get('/monitor/history');
  },
  
  createMonitor: async (monitorData: any) => {
    return api.post('/monitor', monitorData);
  },
  
  checkMonitor: async (id: string) => {
    return api.post(`/monitor/check/${id}`);
  },
};

// Website service
export const websiteService = {
  getContributorWebsites: async () => {
    return api.get('/contributor/websites');
  },
  
  getAllWebsites: async () => {
    return api.get('/admin/websites');
  },
  
  updateWebsiteStatus: async (id: string, status: string) => {
    return api.put(`/admin/websites/${id}/status`, { status });
  },
};

// Wallet service
export const walletService = {
  getUserWallet: async () => {
    return api.get('/user/wallet');
  },
  
  getContributorWallet: async () => {
    return api.get('/contributor/wallet');
  },
  
  initiatePayment: async (amount: number) => {
    return api.post('/payment/create', { amount });
  },
  
  verifyPayment: async (paymentId: string, orderId: string, signature: string) => {
    return api.post('/payment/verify', { paymentId, orderId, signature });
  },
};

// User profile service
export const profileService = {
  getUserProfile: async () => {
    return api.get('/user/profile');
  },
  
  getContributorProfile: async () => {
    return api.get('/contributor/profile');
  },
  
  getAdminProfile: async () => {
    return api.get('/admin/profile');
  },
  
  updateUserProfile: async (data: any) => {
    return api.put('/user/update', data);
  },
  
  updateContributorProfile: async (data: any) => {
    return api.put('/contributor/update', data);
  },
  
  updateAdminProfile: async (data: any) => {
    return api.put('/admin/update', data);
  },
};