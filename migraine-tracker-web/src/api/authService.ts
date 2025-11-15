import { api, tokenManager } from './apiClient';
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types';

// ============================================
// AUTHENTICATION SERVICE
// ============================================

/**
 * Authentication service handles all auth-related API calls
 * Implements best practices for token management and user session handling
 */
export const authService = {
  /**
   * Login user with credentials
   * @param credentials - User email and password
   * @returns AuthResponse with user data and token
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<{ data: AuthResponse }>('/auth/login', credentials);
    
    // Extract the nested data from API response
    const authData = response.data.data;
    
    // Store token in localStorage upon successful login
    if (authData && authData.token) {
      tokenManager.setToken(authData.token);
    }
    
    return authData;
  },

  /**
   * Register new user
   * @param credentials - User registration data
   * @returns AuthResponse with user data and token
   */
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<{ data: AuthResponse }>('/auth/register', credentials);
    
    // Extract the nested data from API response
    const authData = response.data.data;
    
    // Store token in localStorage upon successful registration
    if (authData.token) {
      tokenManager.setToken(authData.token);
    }
    
    return authData;
  },

  /**
   * Logout current user
   * Clears token and notifies backend
   */
  logout: async (): Promise<void> => {
    try {
      // Notify backend about logout (optional, depends on your API)
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear token locally
      tokenManager.removeToken();
    }
  },

  /**
   * Get current user profile
   * @returns Current user data
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<{ data: User }>('/auth/me');
    return response.data.data;
  },

  /**
   * Refresh authentication token
   * @returns New auth token
   */
  refreshToken: async (): Promise<string> => {
    const response = await api.post<{ token: string }>('/auth/refresh');
    
    if (response.data.token) {
      tokenManager.setToken(response.data.token);
    }
    
    return response.data.token;
  },

  /**
   * Check if user is authenticated
   * @returns boolean indicating auth status
   */
  isAuthenticated: (): boolean => {
    return !!tokenManager.getToken();
  },

  /**
   * Request password reset
   * @param email - User email
   */
  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  /**
   * Reset password with token
   * @param token - Reset token from email
   * @param newPassword - New password
   */
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, newPassword });
  },
};

export default authService;

