import axios from 'axios';

export const API_URL = 'http://localhost:5000/api';
export const SOCKET_URL = 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach access token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('foodbridge-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Refresh Token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      localStorage.getItem('foodbridge-refresh-token')
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('foodbridge-refresh-token');
        
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { token } = refreshResponse.data;
        
        localStorage.setItem('foodbridge-token', token);
        
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed, logging out:", refreshError);
        localStorage.removeItem('foodbridge-token');
        localStorage.removeItem('foodbridge-refresh-token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
