// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * User authentication types
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
}

/**
 * Migraine entry types
 */
export interface MigraineEntry {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime?: string;
  intensity: 1 | 2 | 3 | 4 | 5; // Pain scale 1-5
  triggers?: string[];
  symptoms?: string[];
  medication?: string;
  notes?: string;
  location?: PainLocation;
  createdAt: string;
  updatedAt: string;
}

export type PainLocation = 
  | 'frontal'
  | 'temporal'
  | 'occipital'
  | 'whole-head'
  | 'left-side'
  | 'right-side';

export interface CreateMigraineEntry {
  date: string;
  startTime: string;
  endTime?: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  triggers?: string[];
  symptoms?: string[];
  medication?: string;
  notes?: string;
  location?: PainLocation;
}

export interface UpdateMigraineEntry extends Partial<CreateMigraineEntry> {
  id: string;
}

/**
 * API Response types
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Dashboard statistics types
 */
export interface MigraineStats {
  totalEntries: number;
  averageIntensity: number;
  mostCommonTriggers: { trigger: string; count: number }[];
  frequencyByMonth: { month: string; count: number }[];
  intensityTrend: { date: string; intensity: number }[];
}

/**
 * Common UI types
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

