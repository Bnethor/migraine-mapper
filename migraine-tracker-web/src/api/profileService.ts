import { apiClient } from './apiClient';
import type { UserProfile } from '../types';

export const profileService = {
  /**
   * Get current user's profile
   */
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<{ success: boolean; data: UserProfile }>('/profile');
    return response.data.data;
  },

  /**
   * Update user's profile
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.post<{ success: boolean; data: UserProfile }>('/profile', data);
    return response.data.data;
  },

  /**
   * Check if profile is complete (has at least basic information)
   */
  isProfileComplete(profile: UserProfile | null | undefined): boolean {
    if (!profile) return false;
    
    // Check if at least some basic information is filled
    const hasBasicInfo = 
      profile.typicalDuration !== undefined ||
      profile.monthlyFrequency !== undefined ||
      profile.typicalPainLocation !== undefined ||
      profile.typicalPainCharacter !== undefined ||
      profile.typicalPainIntensity !== undefined;
    
    return hasBasicInfo;
  },
};

