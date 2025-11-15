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

export interface UserProfile {
  userId: string;
  // Episode characteristics
  typicalDuration?: 1 | 2 | 3;
  monthlyFrequency?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  // Pain characteristics
  typicalPainLocation?: 0 | 1 | 2;
  typicalPainCharacter?: 0 | 1 | 2;
  typicalPainIntensity?: 0 | 1 | 2 | 3;
  // Common symptoms
  experiencesNausea?: 0 | 1;
  experiencesVomit?: 0 | 1;
  experiencesPhonophobia?: 0 | 1;
  experiencesPhotophobia?: 0 | 1;
  // Aura symptoms
  typicalVisualSymptoms?: 0 | 1 | 2 | 3 | 4;
  typicalSensorySymptoms?: 0 | 1 | 2;
  // Neurological symptoms
  experiencesDysphasia?: 0 | 1;
  experiencesDysarthria?: 0 | 1;
  experiencesVertigo?: 0 | 1;
  experiencesTinnitus?: 0 | 1;
  experiencesHypoacusis?: 0 | 1;
  experiencesDiplopia?: 0 | 1;
  experiencesDefect?: 0 | 1;
  experiencesAtaxia?: 0 | 1;
  experiencesConscience?: 0 | 1;
  experiencesParesthesia?: 0 | 1;
  // Family and diagnosis
  familyHistory?: 0 | 1;
  diagnosedType?: MigraineType;
  createdAt?: string;
  updatedAt?: string;
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

export type MigraineType =
  | 'typical-aura-with-migraine'
  | 'migraine-without-aura'
  | 'typical-aura-without-migraine'
  | 'familial-hemiplegic-migraine'
  | 'sporadic-hemiplegic-migraine'
  | 'basilar-type-aura'
  | 'other';

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

