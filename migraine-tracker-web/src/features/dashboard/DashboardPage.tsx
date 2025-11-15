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
import { getRiskAnalysisPrompt, callAIAgent, type AIAnalysisResponse } from '../../api/riskAnalysisService';
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
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  
  // Simulated data for testing
  const [useSimulatedData, setUseSimulatedData] = useState(true);
  const [simulatedData, setSimulatedData] = useState({
    stress: 30,
    recovery: 65,
    hrv: 45,
    heartRate: 65,
    sleepEfficiency: 85,
    skinTemp: 33.5
  });

  // Generate AI prompt mutation
  const generatePromptMutation = useMutation({
    mutationFn: () => {
      const dataToSend = useSimulatedData ? simulatedData : undefined;
      return getRiskAnalysisPrompt(dataToSend);
    },
    onSuccess: (response) => {
      console.log('Prompt generation response:', response);
      // Backend returns {success: true, data: {prompt, summary, metadata}}
      // apiClient wraps it as {data: backendResponse, success: true}
      // So we need response.data.data.prompt
      if (response?.data?.data?.prompt) {
        setPromptData(response.data.data.prompt);
        setShowPrompt(true);
      } else {
        console.error('Unexpected response structure:', response);
        alert('Received unexpected response from server');
      }
    },
    onError: (error: any) => {
      console.error('Error generating prompt:', error);
      alert(error.message || 'Failed to generate risk analysis prompt');
    }
  });

  // Call AI agent mutation
  const callAIMutation = useMutation({
    mutationFn: (prompt: string) => callAIAgent(prompt),
    onSuccess: (analysis) => {
      setAiAnalysis(analysis);
    },
    onError: (error: any) => {
      console.error('Error calling AI agent:', error);
      alert('Failed to get AI analysis. Please try again.');
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

  // Get AI analysis
  const handleGetAIAnalysis = () => {
    if (promptData) {
      callAIMutation.mutate(promptData);
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

        {/* Simulated Data Panel for Testing */}
        <Card padding="lg" className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Simulate Current Data (for Testing)</CardTitle>
                <CardDescription>
                  Adjust these sliders to simulate current wearable metrics and test AI predictions
                </CardDescription>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSimulatedData}
                  onChange={(e) => setUseSimulatedData(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Use Simulated Data</span>
              </label>
            </div>
          </CardHeader>

          {useSimulatedData && (
            <div className="mt-6 space-y-6">
              {/* Stress Level */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Stress Level
                  </label>
                  <span className="text-lg font-bold text-gray-900">{simulatedData.stress}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simulatedData.stress}
                  onChange={(e) => setSimulatedData(prev => ({ ...prev, stress: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (0)</span>
                  <span>High (100)</span>
                </div>
              </div>

              {/* Recovery Score */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Recovery Score
                  </label>
                  <span className="text-lg font-bold text-gray-900">{simulatedData.recovery}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simulatedData.recovery}
                  onChange={(e) => setSimulatedData(prev => ({ ...prev, recovery: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Poor (0)</span>
                  <span>Excellent (100)</span>
                </div>
              </div>

              {/* HRV */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Heart Rate Variability (HRV)
                  </label>
                  <span className="text-lg font-bold text-gray-900">{simulatedData.hrv} ms</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={simulatedData.hrv}
                  onChange={(e) => setSimulatedData(prev => ({ ...prev, hrv: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (10ms)</span>
                  <span>High (100ms)</span>
                </div>
              </div>

              {/* Heart Rate */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Heart Rate
                  </label>
                  <span className="text-lg font-bold text-gray-900">{simulatedData.heartRate} bpm</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="120"
                  value={simulatedData.heartRate}
                  onChange={(e) => setSimulatedData(prev => ({ ...prev, heartRate: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Rest (40)</span>
                  <span>Active (120)</span>
                </div>
              </div>

              {/* Sleep Efficiency */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Sleep Efficiency
                  </label>
                  <span className="text-lg font-bold text-gray-900">{simulatedData.sleepEfficiency}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simulatedData.sleepEfficiency}
                  onChange={(e) => setSimulatedData(prev => ({ ...prev, sleepEfficiency: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Poor (0%)</span>
                  <span>Perfect (100%)</span>
                </div>
              </div>

              {/* Skin Temperature */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Skin Temperature
                  </label>
                  <span className="text-lg font-bold text-gray-900">{simulatedData.skinTemp.toFixed(1)}°C</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="37"
                  step="0.1"
                  value={simulatedData.skinTemp}
                  onChange={(e) => setSimulatedData(prev => ({ ...prev, skinTemp: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Cool (30°C)</span>
                  <span>Warm (37°C)</span>
                </div>
              </div>

              {/* Preset Scenarios */}
              <div className="pt-4 border-t border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Quick Presets:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSimulatedData({
                      stress: 65,
                      recovery: 25,
                      hrv: 25,
                      heartRate: 85,
                      sleepEfficiency: 60,
                      skinTemp: 34.5
                    })}
                    className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    🚨 High Risk
                  </button>
                  <button
                    onClick={() => setSimulatedData({
                      stress: 35,
                      recovery: 55,
                      hrv: 40,
                      heartRate: 70,
                      sleepEfficiency: 75,
                      skinTemp: 33.5
                    })}
                    className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    ⚠️ Moderate Risk
                  </button>
                  <button
                    onClick={() => setSimulatedData({
                      stress: 20,
                      recovery: 75,
                      hrv: 55,
                      heartRate: 60,
                      sleepEfficiency: 90,
                      skinTemp: 33.0
                    })}
                    className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    ✅ Low Risk
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>

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
                <>
                  <Button
                    variant="secondary"
                    leftIcon={copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                    onClick={handleCopyPrompt}
                    className="flex-1 sm:flex-initial"
                  >
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </Button>
                  <Button
                    variant="primary"
                    leftIcon={<Brain size={20} />}
                    onClick={handleGetAIAnalysis}
                    disabled={callAIMutation.isPending}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    {callAIMutation.isPending ? 'Analyzing...' : 'Get AI Analysis'}
                  </Button>
                </>
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

            {/* AI Analysis Results */}
            {aiAnalysis && (
              <div className="mt-6 space-y-6 border-t-2 border-purple-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Brain className="text-purple-600" size={24} />
                  AI Risk Analysis Results
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Circular Risk Indicator */}
                  <div className="lg:col-span-1 flex flex-col items-center justify-center bg-white rounded-lg p-6 border-2 border-gray-200">
                    <div className="relative w-48 h-48">
                      {/* Circular Progress */}
                      <svg className="w-48 h-48 transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="#E5E7EB"
                          strokeWidth="16"
                          fill="none"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke={
                            aiAnalysis.riskLevel >= 75 ? '#DC2626' :
                            aiAnalysis.riskLevel >= 50 ? '#EA580C' :
                            aiAnalysis.riskLevel >= 25 ? '#F59E0B' :
                            '#10B981'
                          }
                          strokeWidth="16"
                          fill="none"
                          strokeDasharray={`${aiAnalysis.riskLevel * 5.53} 553`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-bold text-gray-900">{aiAnalysis.riskLevel}%</span>
                        <span className="text-sm font-medium text-gray-600 mt-2">{aiAnalysis.riskCategory} Risk</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-xs text-gray-500">Confidence: <span className="font-semibold">{aiAnalysis.confidenceLevel}</span></p>
                    </div>
                  </div>

                  {/* Analysis Details */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Key Risk Factors */}
                    {aiAnalysis.keyRiskFactors.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border-2 border-orange-200">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">🚨 Key Risk Factors</h4>
                        <ul className="space-y-2">
                          {aiAnalysis.keyRiskFactors.map((factor, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-orange-600 mt-0.5">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {aiAnalysis.recommendations.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">💡 Recommendations</h4>
                        <ul className="space-y-2">
                          {aiAnalysis.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-green-600 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Trend Analysis */}
                    {aiAnalysis.trendAnalysis && (
                      <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                        <h4 className="text-sm font-bold text-gray-900 mb-2">📊 Trend Analysis</h4>
                        <p className="text-sm text-gray-700">{aiAnalysis.trendAnalysis}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Analysis Text */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">📄 Complete AI Analysis</h4>
                  <div className="bg-white rounded p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                      {aiAnalysis.fullAnalysis}
                    </pre>
                  </div>
                </div>
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

