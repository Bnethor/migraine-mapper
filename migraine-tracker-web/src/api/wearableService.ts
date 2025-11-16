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
  uploadSessionId: string;
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
  errors: number;
  source: string;
  fieldMapping: Record<string, string>;
  unrecognizedFields: string[];
  errorDetails?: Array<{ timestamp: Date; error: string }>;
  earliestDate?: string | null;
}

export interface UploadSession {
  id: string;
  filename: string;
  fileSize: number;
  source?: string;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  status: 'completed' | 'failed' | 'partial';
  createdAt: string;
  updatedAt: string;
}

// ============================================
// WEARABLE DATA SERVICE
// ============================================

/**
 * Upload CSV file with wearable data (with progress tracking)
 */
export const uploadWearableCSV = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<ApiResponse<UploadResponse>> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    const token = localStorage.getItem('auth_token');

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            data: response,
            success: true,
          });
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    // Handle abort
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Open and send request
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    xhr.open('POST', `${apiBaseUrl}/wearable/upload`);
    
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
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

/**
 * Get upload sessions (list of all uploads)
 */
export const getUploadSessions = async (): Promise<ApiResponse<{ uploads: UploadSession[]; count: number }>> => {
  return api.get<{ uploads: UploadSession[]; count: number }>('/wearable/uploads');
};

/**
 * Get single upload session details
 */
export const getUploadSession = async (
  id: string
): Promise<
  ApiResponse<UploadSession & { fieldMapping?: Record<string, string>; unrecognizedFields?: string[] }>
> => {
  return api.get<UploadSession & { fieldMapping?: Record<string, string>; unrecognizedFields?: string[] }>(
    `/wearable/uploads/${id}`
  );
};

/**
 * Delete upload session and associated data
 */
export const deleteUploadSession = async (
  id: string
): Promise<ApiResponse<{ deletedRecords: number }>> => {
  return api.delete<{ deletedRecords: number }>(`/wearable/uploads/${id}`);
};

/**
 * Delete ALL upload sessions for the current user
 * and all associated wearable data (cleanup)
 */
export const deleteAllUploadSessions = async (): Promise<
  ApiResponse<{ message: string; data?: { deletedCount: number } }>
> => {
  return api.delete<{ message: string; data?: { deletedCount: number } }>(
    '/wearable/uploads'
  );
};

/**
 * Cleanup orphaned wearable data (rows without upload_session_id)
 * Typically data that was uploaded before upload history existed
 */
export const cleanupOrphanedData = async (): Promise<
  ApiResponse<{ message: string; data?: { deletedCount: number } }>
> => {
  return api.post<{ message: string; data?: { deletedCount: number } }>(
    '/wearable/cleanup-orphaned'
  );
};

