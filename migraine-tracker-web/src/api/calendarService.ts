import { api } from './apiClient';
import type { ApiResponse } from '../types';

// ============================================
// TYPES
// ============================================

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  hasData: boolean;
  dataPoints: number;
  isMigraineDay: boolean;
  severity: number | null;
  notes: string | null;
}

export interface CalendarData {
  year: number;
  month: number;
  days: CalendarDay[];
  totalDaysWithData: number;
  totalMigraineDays: number;
}

export interface MigraineDayMarker {
  id: string;
  date: string;
  isMigraineDay: boolean;
  severity: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CALENDAR SERVICE
// ============================================

/**
 * Get calendar data for a specific month
 */
export const getCalendarData = async (
  year?: number,
  month?: number
): Promise<ApiResponse<CalendarData>> => {
  const queryParams = new URLSearchParams();
  
  if (year) {
    queryParams.append('year', year.toString());
  }
  if (month) {
    queryParams.append('month', month.toString());
  }

  const url = `/calendar${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return api.get<CalendarData>(url);
};

/**
 * Mark or unmark a day as a migraine day
 */
export const markMigraineDay = async (
  date: string,
  isMigraineDay: boolean = true,
  severity?: number,
  notes?: string
): Promise<ApiResponse<MigraineDayMarker>> => {
  return api.post<MigraineDayMarker>('/calendar/migraine-day', {
    date,
    isMigraineDay,
    severity,
    notes
  });
};

/**
 * Remove migraine day marker
 */
export const removeMigraineDay = async (date: string): Promise<ApiResponse<{ message: string }>> => {
  return api.delete<{ message: string }>(`/calendar/migraine-day/${date}`);
};

