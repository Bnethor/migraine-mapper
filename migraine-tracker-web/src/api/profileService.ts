import { apiClient } from './apiClient';
import type { UserProfile } from '../types';

export const profileService = {
  /**
   * Get current user's profile
   */
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/profile');
    return response.data;
  },

  /**
   * Update user's profile
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.post('/profile', data);
    return response.data;
  },
};

