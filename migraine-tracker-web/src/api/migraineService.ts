import { api } from './apiClient';
import type {
  MigraineEntry,
  CreateMigraineEntry,
  MigraineStats,
  PaginatedResponse,
  PaginationParams,
} from '../types';

// ============================================
// MIGRAINE SERVICE
// ============================================

/**
 * Migraine service handles all migraine entry-related API calls
 * Implements full CRUD operations with proper typing and error handling
 */
export const migraineService = {
  /**
   * Get all migraine entries for the current user
   * Supports pagination and filtering
   * @param params - Pagination parameters
   * @returns Paginated list of migraine entries
   */
  getAll: async (params?: Partial<PaginationParams>): Promise<PaginatedResponse<MigraineEntry>> => {
    const queryParams = new URLSearchParams({
      page: params?.page?.toString() || '1',
      limit: params?.limit?.toString() || '10',
    });
    
    const response = await api.get<{ data: { entries: MigraineEntry[], pagination: { page: number, limit: number, total: number, pages: number } } }>(
      `/migraine?${queryParams}`
    );
    
    // Map backend response to frontend format
    const backendData = response.data.data;
    return {
      data: backendData.entries,
      total: backendData.pagination.total,
      page: backendData.pagination.page,
      totalPages: backendData.pagination.pages,
    };
  },

  /**
   * Get a single migraine entry by ID
   * @param id - Migraine entry ID
   * @returns Single migraine entry
   */
  getById: async (id: string): Promise<MigraineEntry> => {
    const response = await api.get<{ data: MigraineEntry }>(`/migraine/${id}`);
    return response.data.data;
  },

  /**
   * Create a new migraine entry
   * @param data - Migraine entry data
   * @returns Created migraine entry
   */
  create: async (data: CreateMigraineEntry): Promise<MigraineEntry> => {
    const response = await api.post<{ data: MigraineEntry }>('/migraine', data);
    return response.data.data;
  },

  /**
   * Update an existing migraine entry
   * @param id - Migraine entry ID
   * @param data - Updated migraine entry data
   * @returns Updated migraine entry
   */
  update: async (id: string, data: Partial<CreateMigraineEntry>): Promise<MigraineEntry> => {
    const response = await api.put<{ data: MigraineEntry }>(`/migraine/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a migraine entry
   * @param id - Migraine entry ID
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/migraine/${id}`);
  },

  /**
   * Get migraine statistics for dashboard
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   * @returns Migraine statistics and analytics
   */
  getStatistics: async (startDate?: string, endDate?: string): Promise<MigraineStats> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get<{ 
      data: { 
        totalEntries: number, 
        averageIntensity: number, 
        topTriggers: { trigger: string, count: number }[],
        monthlyFrequency: { month: string, count: number }[]
      } 
    }>(
      `/migraine/statistics${params.toString() ? `?${params}` : ''}`
    );
    
    // Map backend field names to frontend format
    const backendStats = response.data.data;
    return {
      totalEntries: backendStats.totalEntries,
      averageIntensity: backendStats.averageIntensity,
      mostCommonTriggers: backendStats.topTriggers,
      frequencyByMonth: backendStats.monthlyFrequency,
      intensityTrend: [], // Not provided by current backend implementation
    };
  },

  /**
   * Get recent migraine entries
   * @param limit - Number of entries to fetch
   * @returns Array of recent migraine entries
   */
  getRecent: async (limit: number = 5): Promise<MigraineEntry[]> => {
    const response = await api.get<{ data: MigraineEntry[] }>(`/migraine/recent?limit=${limit}`);
    return response.data.data;
  },

  /**
   * Search migraine entries by criteria
   * @param searchParams - Search criteria
   * @returns Filtered migraine entries
   */
  search: async (searchParams: {
    query?: string;
    startDate?: string;
    endDate?: string;
    minIntensity?: number;
    maxIntensity?: number;
    triggers?: string[];
  }): Promise<MigraineEntry[]> => {
    const params = new URLSearchParams();
    
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, String(value));
        }
      }
    });
    
    const response = await api.get<{ data: MigraineEntry[] }>(`/migraine/search?${params}`);
    return response.data.data;
  },

  /**
   * Export migraine entries as CSV or JSON
   * @param format - Export format ('csv' or 'json')
   * @returns Export data blob
   */
  export: async (format: 'csv' | 'json' = 'csv'): Promise<Blob> => {
    const response = await api.get(`/migraine/export?format=${format}`, {
      responseType: 'blob',
    });
    
    return response.data as unknown as Blob;
  },
};

export default migraineService;

