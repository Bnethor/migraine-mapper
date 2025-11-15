import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { getCalendarData, markMigraineDay, removeMigraineDay, removeAllMigraineDays, type CalendarDay } from '../../api/calendarService';
import { processSummaryIndicators } from '../../api/summaryService';
import {
  Layout,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Loading,
  ErrorMessage,
} from '../../components/common';

// ============================================
// CALENDAR PAGE
// ============================================

export const CalendarPage = () => {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  // Initialize with the date from URL parameter or current date
  const getInitialDate = () => {
    if (dateParam) {
      try {
        const parsedDate = new Date(dateParam);
        // Validate the date
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      } catch (e) {
        console.error('Invalid date parameter:', dateParam);
      }
    }
    return new Date();
  };
  
  const [currentDate, setCurrentDate] = useState(getInitialDate);
  const queryClient = useQueryClient();
  
  // Update current date when URL parameter changes
  useEffect(() => {
    if (dateParam) {
      try {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime())) {
          setCurrentDate(parsedDate);
        }
      } catch (e) {
        console.error('Invalid date parameter:', dateParam);
      }
    }
  }, [dateParam]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  // Process summary indicators when leaving the calendar page
  useEffect(() => {
    // Process on mount (when entering page)
    let isMounted = true;
    
    const triggerProcessing = async () => {
      try {
        await processSummaryIndicators(false);
      } catch (error) {
        console.error('Error processing summary indicators:', error);
        // Silently fail - don't interrupt user experience
      }
    };

    // Trigger processing after a short delay to not block page load
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        triggerProcessing();
      }
    }, 1000);

    // Cleanup: Process when component unmounts (user leaves page)
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      
      // Process on unmount (when leaving page)
      processSummaryIndicators(false).catch(error => {
        console.error('Error processing summary indicators on unmount:', error);
      });
    };
  }, []);

  // Fetch calendar data
  const {
    data: calendarData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => getCalendarData(year, month),
  });

  // Mark/unmark migraine day mutation
  const markMutation = useMutation({
    mutationFn: ({ date, isMigraineDay }: { date: string; isMigraineDay: boolean }) =>
      markMigraineDay(date, isMigraineDay),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', year, month] });
    },
  });

  // Remove migraine day mutation
  const removeMutation = useMutation({
    mutationFn: (date: string) => removeMigraineDay(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', year, month] });
    },
  });

  // Remove all migraine days mutation
  const removeAllMutation = useMutation({
    mutationFn: () => removeAllMigraineDays(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  // Handle deselect all
  const handleDeselectAll = () => {
    const totalMigraineDays = calendarData?.data?.data?.totalMigraineDays || calendarData?.data?.totalMigraineDays || 0;
    
    if (totalMigraineDays === 0) {
      alert('No migraine days to deselect.');
      return;
    }

    if (window.confirm(`Are you sure you want to deselect all ${totalMigraineDays} migraine day markers? This action cannot be undone.`)) {
      removeAllMutation.mutate();
    }
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Handle day click - allows manual override of automatic marking
  const handleDayClick = (day: CalendarDay, dayNumber: number) => {
    if (!day.hasData) {
      return; // Don't allow marking days without data
    }

    // Days with entries are automatically marked
    // Only allow unmarking if manually marked OR no entries exist
    if (day.migraineCount && day.migraineCount > 0) {
      // Has entries - don't allow toggling since it's auto-marked
      return;
    }

    // Ensure we use the correct date - construct it from the current month/year and day number
    // This avoids any timezone issues from the API response
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

    if (day.isMigraineDay) {
      // Remove manual marker
      removeMutation.mutate(dateStr);
    } else {
      // Mark as migraine day manually
      markMutation.mutate({ date: dateStr, isMigraineDay: true });
    }
  };

  // Get day of week for first day of month
  const getFirstDayOfWeek = () => {
    const firstDay = new Date(year, month - 1, 1);
    return firstDay.getDay(); // 0 = Sunday, 6 = Saturday
  };

  // Get days in month
  const getDaysInMonth = () => {
    return new Date(year, month, 0).getDate();
  };

  // Get month name
  const getMonthName = () => {
    return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Render calendar day
  const renderDay = (day: CalendarDay, dayNumber: number) => {
    // Get today's date in YYYY-MM-DD format (local timezone)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isToday = todayStr === day.date;

    return (
      <button
        key={day.date}
        onClick={() => handleDayClick(day, dayNumber)}
        disabled={!day.hasData || markMutation.isPending || removeMutation.isPending || (day.migraineCount && day.migraineCount > 0)}
        className={`
          relative p-2 h-20 border rounded-lg
          transition-all duration-200
          ${day.hasData && (!day.migraineCount || day.migraineCount === 0)
            ? 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer'
            : day.hasData
            ? 'border-gray-200 dark:border-gray-700 cursor-default'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 opacity-50 dark:opacity-40 cursor-not-allowed'
          }
          ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
          ${day.isMigraineDay ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700' : ''}
          ${markMutation.isPending || removeMutation.isPending ? 'opacity-50' : ''}
        `}
        title={
          !day.hasData
            ? 'No wearable data available for this day'
            : day.migraineCount && day.migraineCount > 0
            ? `${day.migraineCount} migraine ${day.migraineCount === 1 ? 'entry' : 'entries'} (automatically marked)`
            : day.isMigraineDay
            ? 'Click to unmark (manually marked day)'
            : 'Click to manually mark as migraine day'
        }
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-sm font-medium ${
                isToday 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : day.isMigraineDay 
                  ? 'text-red-700 dark:text-red-400' 
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {dayNumber}
            </span>
            {day.isMigraineDay && (
              <div className="flex items-center gap-1">
                {day.migraineCount && day.migraineCount > 1 && (
                  <span className="text-xs font-bold text-red-700 dark:text-red-400">{day.migraineCount}</span>
                )}
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 mt-auto">
          {day.hasData && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{day.dataPoints}</span>
              </div>
            )}
            {day.migraineCount && day.migraineCount > 0 && (
              <div className="text-xs font-medium text-red-700 dark:text-red-400">
                {day.migraineCount} {day.migraineCount === 1 ? 'entry' : 'entries'}
            </div>
          )}
          </div>
        </div>
      </button>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <ErrorMessage message="Failed to load calendar data" />
        </div>
      </Layout>
    );
  }

  const days = calendarData?.data?.data?.days || calendarData?.data?.days || [];
  const firstDayOfWeek = getFirstDayOfWeek();
  const daysInMonth = getDaysInMonth();

  // Create calendar grid
  const calendarGrid = [];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarGrid.push(
      <div key={`empty-${i}`} className="h-20 border border-transparent" />
    );
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    // Create date string in YYYY-MM-DD format (local timezone, no timezone conversion)
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = days.find((d) => d.date === dateStr) || {
      date: dateStr,
      hasData: false,
      dataPoints: 0,
      isMigraineDay: false,
      severity: null,
      notes: null,
    };
    calendarGrid.push(renderDay(dayData, day));
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Migraine Calendar</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Days with migraine entries are automatically marked. View your wearable data and track patterns.
          </p>
        </div>

        {/* Statistics */}
        {(calendarData?.data?.data || calendarData?.data) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Days with Data</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {calendarData?.data?.data?.totalDaysWithData || calendarData?.data?.totalDaysWithData || 0}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Migraine Days</p>
                <p className="text-2xl font-bold text-red-600">
                  {calendarData?.data?.data?.totalMigraineDays || calendarData?.data?.totalMigraineDays || 0}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{getMonthName()}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Calendar */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  {getMonthName()}
                </CardTitle>
                <CardDescription>
                    Days with migraine logs are automatically marked and counted
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  disabled={isLoading}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  disabled={isLoading}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  disabled={isLoading}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              </div>
              
              {/* Deselect All Button */}
              {((calendarData?.data?.data?.totalMigraineDays || calendarData?.data?.totalMigraineDays || 0) > 0) && (
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={removeAllMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {removeAllMutation.isPending ? 'Deselecting...' : 'Deselect All'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <div className="p-6">
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarGrid}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-gray-600 dark:text-gray-400">Has wearable data</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">Migraine day</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded opacity-50"></div>
                  <span className="text-gray-600 dark:text-gray-400">No data available</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default CalendarPage;

