import { api } from './apiClient';
import type { ApiResponse } from '../types';

export interface RiskAnalysisPrompt {
  prompt: string;
  summary: {
    hasWearableData: boolean;
    dataPoints: number;
    patternCount: number;
    migraineType: string;
    timeRange: {
      start: string;
      end: string;
    } | null;
  };
  metadata: {
    generatedAt: string;
    dataPointsCount: number;
    patternsCount: number;
    hasProfile: boolean;
    timeRange: {
      start: string;
      end: string;
    };
  };
}

export interface RiskAnalysisData {
  wearableData: Array<{
    timestamp: string;
    stress: number | null;
    recovery: number | null;
    heartRate: number | null;
    hrv: number | null;
    sleepEfficiency: number | null;
    sleepHeartRate: number | null;
    skinTemperature: number | null;
    restlessPeriods: number | null;
  }>;
  patterns: Array<{
    patternType: string;
    patternName: string;
    patternDefinition: string;
    thresholdValue: number | null;
    correlationStrength: number | null;
    confidenceScore: number | null;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
  dataPointsCount: number;
  patternsCount: number;
}

/**
 * Get formatted AI prompt for migraine risk analysis
 */
export const getRiskAnalysisPrompt = async (): Promise<
  ApiResponse<RiskAnalysisPrompt>
> => {
  return api.get<RiskAnalysisPrompt>('/risk-prediction/prompt');
};

/**
 * Get raw data for risk prediction (24h data + patterns)
 */
export const getRiskAnalysisData = async (): Promise<
  ApiResponse<RiskAnalysisData>
> => {
  return api.get<RiskAnalysisData>('/risk-prediction/data');
};

