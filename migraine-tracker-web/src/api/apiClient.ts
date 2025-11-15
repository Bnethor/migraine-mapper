import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiError, ApiResponse } from '../types';

// ============================================
// API CLIENT CONFIGURATION
// ============================================

/**
 * Base API URL - Replace with your MCP agent API endpoint
 * You can use environment variables for different environments
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Token management utilities
 */
export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },
  
  setToken: (token: string): void => {
    localStorage.setItem('auth_token', token);
  },
  
  removeToken: (): void => {
    localStorage.removeItem('auth_token');
  },
};

/**
 * Create axios instance with default configuration
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Request interceptor
   * Automatically adds authentication token to requests
   */
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenManager.getToken();
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Log requests in development
      if (import.meta.env.DEV) {
        console.log('🚀 API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data,
        });
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  /**
   * Response interceptor
   * Handles common response scenarios and errors
   */
  client.interceptors.response.use(
    (response) => {
      // Log responses in development
      if (import.meta.env.DEV) {
        console.log('✅ API Response:', {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
      }
      
      return response;
    },
    (error: AxiosError<ApiError>) => {
      // Handle common error scenarios
      if (error.response) {
        const { status, data } = error.response;
        
        // Log errors in development
        if (import.meta.env.DEV) {
          console.error('❌ API Error:', {
            status,
            url: error.config?.url,
            message: data?.message || error.message,
          });
        }
        
        // Handle unauthorized (401) - Clear token and redirect to login
        if (status === 401) {
          tokenManager.removeToken();
          window.location.href = '/login';
        }
        
        // Handle forbidden (403)
        if (status === 403) {
          console.error('Access denied: Insufficient permissions');
        }
        
        // Handle server errors (500+)
        if (status >= 500) {
          console.error('Server error occurred. Please try again later.');
        }
      } else if (error.request) {
        // Network error - no response received
        console.error('Network error: Unable to reach the server');
      }
      
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Main API client instance
 */
export const apiClient = createApiClient();

/**
 * Generic API request wrapper with type safety
 */
export const apiRequest = async <T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: unknown,
  config?: unknown
): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.request({
      method,
      url,
      data,
      ...(config as object),
    });
    
    return {
      data: response.data,
      success: true,
    };
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>;
    
    throw {
      message: axiosError.response?.data?.message || 'An unexpected error occurred',
      code: axiosError.code,
      status: axiosError.response?.status,
    } as ApiError;
  }
};

/**
 * Convenience methods for common HTTP operations
 */
export const api = {
  get: <T>(url: string, config?: unknown) => 
    apiRequest<T>('get', url, undefined, config),
  
  post: <T>(url: string, data?: unknown, config?: unknown) => 
    apiRequest<T>('post', url, data, config),
  
  put: <T>(url: string, data?: unknown, config?: unknown) => 
    apiRequest<T>('put', url, data, config),
  
  patch: <T>(url: string, data?: unknown, config?: unknown) => 
    apiRequest<T>('patch', url, data, config),
  
  delete: <T>(url: string, config?: unknown) => 
    apiRequest<T>('delete', url, undefined, config),
};

export default apiClient;

