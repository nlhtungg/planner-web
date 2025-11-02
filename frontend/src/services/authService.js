import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/auth';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 errors and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/refresh-token`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

const authService = {
  // Register with email/password
  register: async (userData) => {
    const response = await api.post('/register', userData);
    return response.data;
  },

  // Login with email/password
  login: async (credentials) => {
    const response = await api.post('/login', credentials);
    return response.data;
  },

  // Login with Google
  googleLogin: async (idToken) => {
    const response = await api.post('/google', { idToken });
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },

  // Update profile
  updateProfile: async (updates) => {
    const response = await api.put('/profile', updates);
    return response.data;
  },

  // Change password
  changePassword: async (passwords) => {
    const response = await api.post('/change-password', passwords);
    return response.data;
  },

  // Logout
  logout: async (refreshToken) => {
    const response = await api.post('/logout', { refreshToken });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken) => {
    const response = await api.post('/refresh-token', { refreshToken });
    return response.data;
  },
};

export default authService;
