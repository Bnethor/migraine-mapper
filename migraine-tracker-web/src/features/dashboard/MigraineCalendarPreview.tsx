import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCalendarData, type CalendarDay } from '../../api/calendarService';
import { Button, Loading } from '../../components/common';

/**
 * Mini calendar preview for dashboard
 * Shows current month with migraine days marked
 * Clickable to navigate to full calendar page
 */
export const MigraineCalendarPreview = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  // Fetch calendar data
  const {
    data: calendarData,
    isLoading,
  } = useQuery({
    queryKey: ['calendar-preview', year, month],
    queryFn: () => getCalendarData(year, month),
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getMonthName = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getFirstDayOfWeek = () => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getDaysInMonth = () => {
    return new Date(year, month, 0).getDate();
  };

  const handleCalendarClick = () => {
    // Navigate to calendar page with current month
    navigate(`/calendar?date=${year}-${String(month).padStart(2, '0')}-01`);
  };

  if (isLoading) {
    return <Loading text="Loading calendar..." />;
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
      <div key={`empty-${i}`} className="h-12 border border-transparent" />
    );
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = days.find((d) => d.date === dateStr) || {
      date: dateStr,
      hasData: false,
      dataPoints: 0,
      isMigraineDay: false,
    };

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isToday = todayStr === dateStr;

    calendarGrid.push(
      <div
        key={dateStr}
        className={`
          h-12 border rounded flex items-center justify-center text-sm relative
          ${dayData.isMigraineDay 
            ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' 
            : dayData.hasData
            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 opacity-50'
          }
          ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
        `}
      >
        <span
          className={`font-medium ${
            isToday
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : dayData.isMigraineDay
              ? 'text-red-700 dark:text-red-400 font-semibold'
              : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {day}
        </span>
        {dayData.isMigraineDay && (
          <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400 absolute top-1 right-1" />
        )}
      </div>
    );
  }

  const totalMigraineDays = calendarData?.data?.data?.totalMigraineDays || calendarData?.data?.totalMigraineDays || 0;
  const totalDaysWithData = calendarData?.data?.data?.totalDaysWithData || calendarData?.data?.totalDaysWithData || 0;

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{getMonthName()}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateMonth('prev');
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentDate(new Date());
            }}
            className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Today
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateMonth('next');
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Migraine Days</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-500">{totalMigraineDays}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Days with Data</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalDaysWithData}</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div 
        onClick={handleCalendarClick}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarGrid}
        </div>
      </div>

      {/* Click to view full calendar */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCalendarClick}
        className="w-full"
      >
        View Full Calendar →
      </Button>
    </div>
  );
};

export default MigraineCalendarPreview;

