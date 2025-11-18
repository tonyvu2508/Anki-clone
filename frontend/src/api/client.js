import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Remove trailing slash and ensure /api is added only once
const baseURL = API_URL.endsWith('/api') 
  ? API_URL 
  : API_URL.endsWith('/') 
    ? `${API_URL}api` 
    : `${API_URL}/api`;

const client = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;

