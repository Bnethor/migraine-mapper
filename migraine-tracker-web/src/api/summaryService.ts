import { api } from './apiClient';
import type { ApiResponse } from '../types';

// ============================================
// TYPES
// ============================================

export interface SummaryIndicator {
  id: string;
  periodStart: string;
  periodEnd: string;
  stress: {
    avg: number | null;
    max: number | null;
    volatility: number | null;
    trend: string | null;
  };
  recovery: {
    avg: number | null;
    min: number | null;
    trend: string | null;
  };
  heartRate: {
    avg: number | null;
    resting: number | null;
    max: number | null;
  };
  hrv: {
    avg: number | null;
    trend: string | null;
    volatility: number | null;
  };
  sleep: {
    efficiency: number | null;
    heartRate: number | null;
    restlessPeriods: number | null;
  };
  temperature: {
    avg: number | null;
    variation: number | null;
  };
  overallWellnessScore: number | null;
  riskFactors: Array<{
    type: string;
    value?: number;
    severity: string;
  }>;
  dataPointsCount: number;
  processedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessSummaryResponse {
  cached: boolean;
  processed?: number;
  errors?: number;
  processedDays?: string[];
  errorDetails?: Array<{ date: string; error: string }>;
  lastProcessedDate?: string;
  message: string;
}

// ============================================
// SUMMARY SERVICE
// ============================================

/**
 * Process summary indicators (with automatic caching)
 */
export const processSummaryIndicators = async (
  forceReprocess: boolean = false
): Promise<ApiResponse<ProcessSummaryResponse>> => {
  return api.post<ProcessSummaryResponse>('/summary/process', {
    forceReprocess
  });
};

/**
 * Get summary indicators for a date range
 */
export const getSummaryIndicators = async (
  params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<ApiResponse<{ summaries: SummaryIndicator[]; count: number }>> => {
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

  const url = `/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return api.get<{ summaries: SummaryIndicator[]; count: number }>(url);
};

/**
 * Get migraine correlation patterns
 */
export const getMigraineCorrelations = async (): Promise<ApiResponse<{
  patterns: Array<{
    patternType: string;
    patternName: string;
    patternDefinition: any;
    correlationStrength: number | null;
    confidenceScore: number | null;
    thresholdValue: number | null;
    avgValueOnMigraineDays: number | null;
    avgValueOnNormalDays: number | null;
    migraineDaysCount: number;
    totalDaysAnalyzed: number;
    lastUpdated: string;
  }>;
  count: number;
}>> => {
  return api.get<{
    patterns: Array<{
      patternType: string;
      patternName: string;
      patternDefinition: any;
      correlationStrength: number | null;
      confidenceScore: number | null;
      thresholdValue: number | null;
      avgValueOnMigraineDays: number | null;
      avgValueOnNormalDays: number | null;
      migraineDaysCount: number;
      totalDaysAnalyzed: number;
      lastUpdated: string;
    }>;
    count: number;
  }>('/summary/correlations');
};

