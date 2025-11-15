import { useEffect, useState, useState } from 'react';
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
import { profileService } from '../../api/profileService';
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
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('do_ai_agent_api_key') || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  
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

  // Combined mutation: Generate prompt and get AI analysis in one flow
  const getAIAnalysisMutation = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      setShowFullAnalysis(false); // Close the raw response section when starting new analysis
      
      // Step 1: Generate prompt
      const dataToSend = useSimulatedData ? simulatedData : undefined;
      const promptResponse = await getRiskAnalysisPrompt(dataToSend);
      
      console.log('Prompt generation response:', promptResponse);
      
      // Extract prompt from response
      let prompt = '';
      if (promptResponse?.data?.data?.prompt) {
        prompt = promptResponse.data.data.prompt;
      } else {
        throw new Error('Failed to generate prompt');
      }
      
      // Step 2: Call AI agent with the prompt
      const analysis = await callAIAgent(prompt);
      return analysis;
    },
    onSuccess: (analysis) => {
      setAiAnalysis(analysis);
      setIsAnalyzing(false);
    },
    onError: (error: any) => {
      console.error('Error in AI analysis:', error);
      setIsAnalyzing(false);
      alert(error.message || 'Failed to get AI analysis. Please try again.');
    }
  });

  // Save API key to localStorage
  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('do_ai_agent_api_key', apiKey.trim());
      setShowApiKeyInput(false);
      alert('API key saved successfully!');
    } else {
      alert('Please enter a valid API key');
    }
  };
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

        {/* AI API Key Configuration Warning */}
        {!apiKey && (
          <Card padding="lg" className="border-2 border-yellow-200 bg-yellow-50">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600 mt-1 text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900 mb-2">AI Agent API Key Required</h3>
                <p className="text-sm text-gray-700 mb-3">
                  To use AI-powered risk analysis, configure your API key from:
                  <br />
                  <strong>DigitalOcean Control Panel → AI Agents → Your Agent → API Keys</strong>
                </p>
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Configure API Key
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* API Key Input */}
        {showApiKeyInput && (
          <Card padding="lg" className="border-2 border-blue-200 bg-blue-50">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Configure AI Agent API Key</h3>
              <div className="bg-white p-3 rounded border border-blue-200 text-sm">
                <p className="font-semibold text-gray-900 mb-2">How to get your API key:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Go to <a href="https://cloud.digitalocean.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">DigitalOcean Control Panel</a></li>
                  <li>Navigate to <strong>AI Agents</strong></li>
                  <li>Select your agent</li>
                  <li>Go to <strong>API Keys</strong> section</li>
                  <li>Copy your API key and paste it below</li>
                </ol>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">API Key *</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your API key here..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save API Key
                </button>
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        )}

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
                  {apiKey && (
                    <button
                      onClick={() => setShowApiKeyInput(true)}
                      className="ml-2 text-xs text-blue-600 hover:underline"
                    >
                      (Change API Key)
                    </button>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="mt-6 space-y-6">
            {/* Simulated Data Section */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Test with Simulated Data</h3>
                  <p className="text-xs text-gray-600">Adjust metrics to test different risk scenarios</p>
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

              {useSimulatedData && (
                <div className="space-y-4">
                  {/* Quick Presets at top */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSimulatedData({ stress: 65, recovery: 25, hrv: 25, heartRate: 85, sleepEfficiency: 60, skinTemp: 34.5 })}
                      className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                    >
                      🚨 High Risk
                    </button>
                    <button
                      onClick={() => setSimulatedData({ stress: 35, recovery: 55, hrv: 40, heartRate: 70, sleepEfficiency: 75, skinTemp: 33.5 })}
                      className="px-3 py-1.5 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
                    >
                      ⚠️ Moderate Risk
                    </button>
                    <button
                      onClick={() => setSimulatedData({ stress: 20, recovery: 75, hrv: 55, heartRate: 60, sleepEfficiency: 90, skinTemp: 33.0 })}
                      className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                    >
                      ✅ Low Risk
                    </button>
                  </div>

                  {/* Compact sliders - 2 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Stress */}
                    <div className="bg-white p-2 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-700">Stress</label>
                        <span className="text-sm font-bold text-gray-900">{simulatedData.stress}</span>
                      </div>
                      <input type="range" min="0" max="100" value={simulatedData.stress} onChange={(e) => setSimulatedData(prev => ({ ...prev, stress: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500" />
                    </div>

                    {/* Recovery */}
                    <div className="bg-white p-2 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-700">Recovery</label>
                        <span className="text-sm font-bold text-gray-900">{simulatedData.recovery}</span>
                      </div>
                      <input type="range" min="0" max="100" value={simulatedData.recovery} onChange={(e) => setSimulatedData(prev => ({ ...prev, recovery: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500" />
                    </div>

                    {/* HRV */}
                    <div className="bg-white p-2 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-700">HRV</label>
                        <span className="text-sm font-bold text-gray-900">{simulatedData.hrv}ms</span>
                      </div>
                      <input type="range" min="0" max="100" value={simulatedData.hrv} onChange={(e) => setSimulatedData(prev => ({ ...prev, hrv: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>

                    {/* Heart Rate */}
                    <div className="bg-white p-2 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-700">Heart Rate</label>
                        <span className="text-sm font-bold text-gray-900">{simulatedData.heartRate} bpm</span>
                      </div>
                      <input type="range" min="40" max="120" value={simulatedData.heartRate} onChange={(e) => setSimulatedData(prev => ({ ...prev, heartRate: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                    </div>

                    {/* Sleep Efficiency */}
                    <div className="bg-white p-2 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-700">Sleep Efficiency</label>
                        <span className="text-sm font-bold text-gray-900">{simulatedData.sleepEfficiency}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={simulatedData.sleepEfficiency} onChange={(e) => setSimulatedData(prev => ({ ...prev, sleepEfficiency: parseInt(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    </div>

                    {/* Skin Temperature */}
                    <div className="bg-white p-2 rounded">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-700">Skin Temp</label>
                        <span className="text-sm font-bold text-gray-900">{simulatedData.skinTemp.toFixed(1)}°C</span>
                      </div>
                      <input type="range" min="30" max="37" step="0.1" value={simulatedData.skinTemp} onChange={(e) => setSimulatedData(prev => ({ ...prev, skinTemp: parseFloat(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <Button
              variant="primary"
              leftIcon={<Brain size={24} />}
              onClick={() => getAIAnalysisMutation.mutate()}
              disabled={getAIAnalysisMutation.isPending || isAnalyzing}
              className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isAnalyzing ? 'Analyzing...' : 'Get AI Risk Analysis'}
            </Button>

            {getAIAnalysisMutation.isError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <p className="font-semibold mb-1">Failed to analyze risk</p>
                <p className="text-xs">Please ensure you have uploaded wearable data and marked migraine days in the calendar.</p>
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
                        {aiAnalysis.riskLevel > 0 && (
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
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {aiAnalysis.riskLevel > 0 ? (
                          <>
                            <span className="text-5xl font-bold text-gray-900">{aiAnalysis.riskLevel}%</span>
                            <span className="text-sm font-medium text-gray-600 mt-2">12 Hour Risk</span>
                          </>
                        ) : (
                          <>
                            <span className="text-4xl font-bold text-gray-400">N/A</span>
                            <span className="text-sm font-medium text-gray-500 mt-2">Unable to Calculate</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-xs text-gray-600">
                        {aiAnalysis.riskLevel > 0 ? (
                          <span className="font-semibold">{aiAnalysis.riskCategory}</span>
                        ) : (
                          <span className="text-gray-400">No risk data available</span>
                        )}
                      </p>
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

                {/* Full Analysis Text - Collapsible */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <button
                    onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-100 rounded p-2 transition-colors"
                  >
                    <h4 className="text-sm font-bold text-gray-900">📄 Complete AI Analysis (Raw Response)</h4>
                    <span className="text-gray-600">
                      {showFullAnalysis ? '▼' : '▶'}
                    </span>
                  </button>
                  {showFullAnalysis && (
                    <div className="bg-white rounded p-4 max-h-96 overflow-y-auto mt-3">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                        {aiAnalysis.fullAnalysis}
                      </pre>
                    </div>
                  )}
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

