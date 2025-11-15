import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Activity,
  Plus 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { migraineService } from '../../api/migraineService';
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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
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
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalEntries || 0}
                </p>
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
                <p className="text-sm text-gray-600">Avg. Intensity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.averageIntensity?.toFixed(1) || '0.0'}
                  <span className="text-sm text-gray-500">/5</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Top Trigger */}
          <Card hover padding="lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Top Trigger</p>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {stats?.mostCommonTriggers?.[0]?.trigger || 'None'}
                </p>
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
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.frequencyByMonth?.[0]?.count || 0}
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

