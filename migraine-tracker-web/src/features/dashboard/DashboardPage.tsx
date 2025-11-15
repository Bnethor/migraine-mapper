import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Activity,
  Plus,
  User,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { migraineService } from '../../api/migraineService';
import { profileService } from '../../api/profileService';
import { processSummaryIndicators } from '../../api/summaryService';
import { 
  Layout, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Loading, 
  ErrorMessage,
  Button 
} from '../../components/common';
import MigraineChart from './MigraineChart';
import RecentEntries from './RecentEntries';

// ============================================
// DASHBOARD PAGE
// ============================================

/**
 * Dashboard Page Component
 * Features:
 * - Overview statistics
 * - Interactive charts
 * - Recent migraine entries
 * - Quick action buttons
 */
export const DashboardPage = () => {
  const navigate = useNavigate();
  const [dismissedProfileNotification, setDismissedProfileNotification] = useState(false);

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => profileService.getProfile(),
  });

  const isProfileComplete = profileService.isProfileComplete(profile);
  const showProfileNotification = !isProfileComplete && !dismissedProfileNotification;

  // Process summary indicators when entering dashboard
  useEffect(() => {
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

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Fetch statistics
  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['migraine-stats'],
    queryFn: () => migraineService.getStatistics(),
  });

  // Fetch recent entries
  const { 
    data: recentEntries, 
    isLoading: entriesLoading,
    error: entriesError,
    refetch: refetchEntries
  } = useQuery({
    queryKey: ['recent-migraines'],
    queryFn: () => migraineService.getRecent(5),
  });

  // Loading state
  if (statsLoading || entriesLoading) {
    return (
      <Layout>
        <Loading fullScreen text="Loading dashboard..." />
      </Layout>
    );
  }

  // Error state
  if (statsError || entriesError) {
    return (
      <Layout>
        <ErrorMessage
          title="Failed to load dashboard"
          message="There was an error loading your dashboard data."
          onRetry={() => {
            refetchStats();
            refetchEntries();
          }}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Profile Incomplete Notification */}
        {showProfileNotification && (
          <Card padding="md" className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                  <User className="text-yellow-600 dark:text-yellow-400" size={20} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  Complete Your Clinical Profile
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                  Your clinical profile helps us provide better insights and pattern analysis. Please fill out your typical migraine characteristics.
                </p>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate('/profile')}
                  >
                    Go to Profile
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDismissedProfileNotification(true)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setDismissedProfileNotification(true)}
                className="flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300"
                aria-label="Dismiss notification"
              >
                <X size={20} />
              </button>
            </div>
          </Card>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track and analyze your migraine patterns
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus size={20} />}
            onClick={() => navigate('/migraines/new')}
          >
            Log New Migraine
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Entries */}
          <Card hover padding="lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats?.totalEntries || 0}
                </p>
                {stats?.migraineEntries !== undefined && stats?.wearableDays !== undefined && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {stats.migraineEntries} logs + {stats.wearableDays} data days
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Average Intensity */}
          <Card hover padding="lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Activity className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Intensity</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats?.averageIntensity?.toFixed(1) || '0.0'}
                  <span className="text-sm text-gray-500 dark:text-gray-400">/5</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Top Trigger */}
          <Card 
            hover 
            padding="lg"
            onClick={() => {
              if (!stats?.topTrigger || stats.topTrigger.trigger === 'None') {
                navigate('/calendar');
              }
            }}
            className={!stats?.topTrigger || stats.topTrigger.trigger === 'None' ? 'cursor-pointer' : ''}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="text-yellow-600" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">Top Trigger</p>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100 break-words leading-tight">
                  {stats?.topTrigger?.trigger || stats?.mostCommonTriggers?.[0]?.trigger || 'None'}
                </p>
                {stats?.topTrigger?.correlationStrength !== null && 
                 stats?.topTrigger?.correlationStrength !== undefined ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {Math.abs(stats.topTrigger.correlationStrength * 100).toFixed(0)}% correlation
                  </p>
                ) : stats?.wearableDays && stats.wearableDays > 0 && (
                  <p className="text-xs text-blue-600 mt-0.5 hover:underline">
                    Mark migraine days →
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* This Month */}
          <Card hover padding="lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats?.frequencyByMonth?.[stats.frequencyByMonth.length - 1]?.count || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Intensity Trend Chart */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Intensity Trend</CardTitle>
              <CardDescription>
                Track how your migraine intensity changes over time
              </CardDescription>
            </CardHeader>
            <MigraineChart data={stats?.intensityTrend || []} type="intensity" />
          </Card>

          {/* Frequency Chart */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Monthly Frequency</CardTitle>
              <CardDescription>
                Number of migraines per month
              </CardDescription>
            </CardHeader>
            <MigraineChart data={stats?.frequencyByMonth || []} type="frequency" />
          </Card>
        </div>

        {/* Recent Entries */}
        <Card padding="lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Entries</CardTitle>
                <CardDescription>
                  Your latest migraine logs
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/migraines')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <RecentEntries entries={recentEntries || []} />
        </Card>
      </div>
    </Layout>
  );
};

export default DashboardPage;

