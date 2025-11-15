import { api } from './apiClient';
import type { ApiResponse } from '../types';

// ============================================
// TYPES
// ============================================

export interface WearableDataEntry {
  id: string;
  timestamp: string;
  stressValue?: number;
  recoveryValue?: number;
  heartRate?: number;
  hrv?: number;
  sleepEfficiency?: number;
  sleepHeartRate?: number;
  skinTemperature?: number;
  restlessPeriods?: number;
  additionalData?: Record<string, unknown>;
  source?: string;
  createdAt: string;
}

export interface WearableDataResponse {
  entries: WearableDataEntry[];
  count: number;
}

export interface WearableStatistics {
  totalRecords: number;
  averages: {
    stress?: number;
    recovery?: number;
    heartRate?: number;
    hrv?: number;
    sleepEfficiency?: number;
    sleepHeartRate?: number;
    skinTemperature?: number;
  };
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
}

export interface UploadResponse {
  inserted: number;
  total: number;
  errors: number;
  source: string;
  fieldMapping: Record<string, string>;
  unrecognizedFields: string[];
  errorDetails?: Array<{ timestamp: Date; error: string }>;
}

// ============================================
// WEARABLE DATA SERVICE
// ============================================

/**
 * Upload CSV file with wearable data
 */
export const uploadWearableCSV = async (
  file: File
): Promise<ApiResponse<UploadResponse>> => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post<UploadResponse>(
    '/wearable/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
};

/**
 * Get wearable data entries
 */
export const getWearableData = async (
  params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<ApiResponse<WearableDataResponse>> => {
  const queryParams = new URLSearchParams();
  
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const url = `/wearable${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return api.get<WearableDataResponse>(url);
};

/**
 * Get wearable data statistics
 */
export const getWearableStatistics = async (
  params?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<ApiResponse<WearableStatistics>> => {
  const queryParams = new URLSearchParams();
  
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }

  const url = `/wearable/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return api.get<WearableStatistics>(url);
};

