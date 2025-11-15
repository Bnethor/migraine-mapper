import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Activity,
  Plus,
  Brain,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { migraineService } from '../../api/migraineService';
import { processSummaryIndicators } from '../../api/summaryService';
import { getRiskAnalysisPrompt } from '../../api/riskAnalysisService';
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
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptData, setPromptData] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate AI prompt mutation
  const generatePromptMutation = useMutation({
    mutationFn: getRiskAnalysisPrompt,
    onSuccess: (response) => {
      if (response.data) {
        setPromptData(response.data.prompt);
        setShowPrompt(true);
      }
    },
    onError: (error: any) => {
      console.error('Error generating prompt:', error);
      alert(error.response?.data?.message || 'Failed to generate risk analysis prompt');
    }
  });

  // Copy prompt to clipboard
  const handleCopyPrompt = () => {
    if (promptData) {
      navigator.clipboard.writeText(promptData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

        {/* AI Risk Analysis Section */}
        <Card padding="lg" className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Brain className="text-purple-600" size={28} />
              </div>
              <div className="flex-1">
                <CardTitle>AI-Powered Risk Analysis</CardTitle>
                <CardDescription>
                  Generate a comprehensive 12-hour migraine risk assessment based on your recent data and patterns
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                leftIcon={<Brain size={20} />}
                onClick={() => generatePromptMutation.mutate()}
                disabled={generatePromptMutation.isPending}
                className="flex-1 sm:flex-initial"
              >
                {generatePromptMutation.isPending ? 'Generating...' : 'Generate Risk Analysis Prompt'}
              </Button>
              {promptData && (
                <Button
                  variant="secondary"
                  leftIcon={copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                  onClick={handleCopyPrompt}
                  className="flex-1 sm:flex-initial"
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </Button>
              )}
            </div>

            {showPrompt && promptData && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    AI Prompt Ready
                  </h3>
                  <button
                    onClick={() => setShowPrompt(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Hide
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                    {promptData}
                  </pre>
                </div>
                <p className="text-xs text-gray-600">
                  💡 <strong>Next Step:</strong> Copy this prompt and paste it into your DigitalOcean AI agent endpoint to get your personalized migraine risk analysis.
                </p>
              </div>
            )}

            {generatePromptMutation.isError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <p>Failed to generate prompt. Make sure you have:</p>
                <ul className="list-disc list-inside mt-2 ml-2">
                  <li>Uploaded wearable data (last 24 hours)</li>
                  <li>Marked migraine days in the calendar</li>
                  <li>Completed your user profile</li>
                </ul>
              </div>
            )}
          </div>
        </Card>

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

