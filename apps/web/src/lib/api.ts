import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach bearer token if logged in (except for public endpoints)
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const isPublic = config.url?.includes('/public/');
    if (!isPublic) {
      const token = localStorage.getItem('invite_token');
      if (token && config.headers) {
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
  }

  // If payload is FormData, remove manual Content-Type header so browser sets multipart/form-data with boundary
  if (config.data instanceof FormData && config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
    }
  }

  return config;
});

// Response interceptor for consistent error extraction and token expiry handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    // Check if token has expired or is unauthorized on private endpoints
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isPublic = error.config?.url?.includes('/public/');
      const isAuthRoute =
        window.location.pathname.startsWith('/login') ||
        window.location.pathname.startsWith('/verify-otp');
      if (!isPublic && !isAuthRoute) {
        // If there's an expired token and no active refresh, clear token if genuinely required
        const refreshToken = localStorage.getItem('invite_refresh_token');
        if (!refreshToken) {
          localStorage.removeItem('invite_token');
        }
      }
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
