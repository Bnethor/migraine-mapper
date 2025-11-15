import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { getMigraineCorrelations } from '../../api/summaryService';
import { processSummaryIndicators } from '../../api/summaryService';
import {
  Layout,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Loading,
  ErrorMessage,
  Button,
} from '../../components/common';

// Feature flag: Set to false to hide the force reprocess button
const SHOW_FORCE_REPROCESS_BUTTON = true;

// ============================================
// PATTERNS PAGE
// ============================================

export const PatternsPage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: correlationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['migraine-correlations'],
    queryFn: () => getMigraineCorrelations(),
  });

  // Force reprocess mutation
  const forceReprocessMutation = useMutation({
    mutationFn: () => processSummaryIndicators(true), // forceReprocess = true
    onMutate: () => {
      setIsProcessing(true);
      setProcessMessage('Processing correlation patterns...');
    },
    onSuccess: (data) => {
      const correlations = data?.data?.data?.correlations;
      if (correlations) {
        const patternsCount = correlations.patterns?.length || 0;
        const savedCount = correlations.saved || 0;
        setProcessMessage(
          `Processing complete! Analyzed ${correlations.totalDaysAnalyzed || 0} days. ` +
          `Identified ${patternsCount} patterns. ${savedCount} patterns saved.`
        );
      } else {
        setProcessMessage('Processing complete. Refreshing patterns...');
      }
      // Refetch correlations and invalidate dashboard statistics after processing
      setTimeout(() => {
        refetch();
        // Invalidate dashboard statistics to update the top trigger
        queryClient.invalidateQueries({ queryKey: ['migraine-stats'] });
        setIsProcessing(false);
        setProcessMessage(null);
      }, 2000);
    },
    onError: (error: any) => {
      setProcessMessage(`Error: ${error?.message || 'Failed to process patterns'}`);
      setIsProcessing(false);
      setTimeout(() => setProcessMessage(null), 5000);
    },
  });

  const handleForceReprocess = () => {
    forceReprocessMutation.mutate();
  };

  const patterns = correlationsData?.data?.data?.patterns || [];

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
          <ErrorMessage message="Failed to load correlation patterns" />
        </div>
      </Layout>
    );
  }

  // Helper to format correlation strength
  const formatCorrelation = (strength: number | null) => {
    if (strength === null) return 'N/A';
    const percentage = Math.abs(strength * 100).toFixed(1);
    const direction = strength > 0 ? 'positive' : 'negative';
    return `${percentage}% ${direction}`;
  };

  // Helper to get correlation color
  const getCorrelationColor = (strength: number | null) => {
    if (strength === null) return 'text-gray-500';
    const absStrength = Math.abs(strength);
    if (absStrength > 0.5) return 'text-red-600';
    if (absStrength > 0.3) return 'text-orange-600';
    return 'text-yellow-600';
  };

  // Helper to get confidence color
  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'text-gray-500';
    if (confidence > 0.7) return 'text-green-600';
    if (confidence > 0.4) return 'text-yellow-600';
    return 'text-orange-600';
  };

  // Helper to format pattern definition
  const formatPatternDefinition = (definition: any) => {
    if (!definition || typeof definition !== 'object') return 'N/A';
    
    const metric = definition.metric || 'unknown';
    const operator = definition.operator || '?';
    const threshold = definition.threshold !== undefined ? definition.threshold.toFixed(2) : 'N/A';
    
    return `${metric} ${operator} ${threshold}`;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Migraine Correlation Patterns</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Patterns identified from your wearable data that correlate with migraine days.
              These patterns are used for risk prediction.
            </p>
          </div>
          {SHOW_FORCE_REPROCESS_BUTTON && (
            <Button
              onClick={handleForceReprocess}
              disabled={isProcessing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              {isProcessing ? 'Processing...' : 'Force Recalculate'}
            </Button>
          )}
        </div>

        {/* Processing Message */}
        {processMessage && (
          <div
            className={`p-4 rounded-lg ${
              processMessage.includes('Error')
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <p className="text-sm font-medium">{processMessage}</p>
          </div>
        )}

        {/* Summary Stats */}
        {patterns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Identified Patterns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{patterns.length}</p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Strong Correlations</p>
                <p className="text-2xl font-bold text-orange-600">
                  {patterns.filter(p => Math.abs(p.correlationStrength || 0) > 0.3).length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Effect size &gt; 0.3</p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Migraine Days Analyzed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {patterns.length > 0 ? patterns[0].migraineDaysCount : 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">of {patterns.length > 0 ? patterns[0].totalDaysAnalyzed : 0} total days</p>
              </div>
            </Card>
          </div>
        )}

        {/* Patterns List */}
        {patterns.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Patterns Identified Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                To identify correlation patterns, you need to:
              </p>
              <ul className="text-left text-gray-600 dark:text-gray-400 space-y-2 max-w-md mx-auto">
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Have wearable data uploaded</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Mark migraine days in the calendar</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Have both migraine and non-migraine days for comparison</span>
                </li>
              </ul>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                Patterns are automatically analyzed when you visit the dashboard or calendar page.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {patterns.map((pattern) => (
              <Card key={pattern.patternType}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3">
                        {pattern.patternName}
                        {pattern.correlationStrength !== null && (
                          <span
                            className={`text-base font-semibold ${getCorrelationColor(
                              pattern.correlationStrength
                            )}`}
                          >
                            {pattern.correlationStrength > 0 ? (
                              <TrendingUp className="w-5 h-5 inline mr-1" />
                            ) : (
                              <TrendingDown className="w-5 h-5 inline mr-1" />
                            )}
                            {formatCorrelation(pattern.correlationStrength)}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2 flex items-center gap-3">
                        <span>
                          Pattern Type: <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                            {pattern.patternType}
                          </code>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          • Based on {pattern.migraineDaysCount} migraine day{pattern.migraineDaysCount !== 1 ? 's' : ''}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <div className="p-6 space-y-4">
                  {/* Pattern Definition */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Pattern Definition
                    </h4>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                      {formatPatternDefinition(pattern.patternDefinition)}
                    </p>
                    {pattern.thresholdValue !== null && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Threshold: <strong>{pattern.thresholdValue.toFixed(2)}</strong>
                      </p>
                    )}
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg on Migraine Days</p>
                      <p className="text-lg font-semibold text-red-600">
                        {pattern.avgValueOnMigraineDays !== null
                          ? pattern.avgValueOnMigraineDays.toFixed(2)
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg on Normal Days</p>
                      <p className="text-lg font-semibold text-green-600">
                        {pattern.avgValueOnNormalDays !== null
                          ? pattern.avgValueOnNormalDays.toFixed(2)
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Migraine Days Analyzed</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {pattern.migraineDaysCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Days Analyzed</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {pattern.totalDaysAnalyzed}
                      </p>
                    </div>
                  </div>

                  {/* Correlation Details */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Correlation Strength (Effect Size):</span>
                        <span
                          className={`ml-2 font-semibold ${getCorrelationColor(
                            pattern.correlationStrength
                          )}`}
                        >
                          {pattern.correlationStrength !== null
                            ? pattern.correlationStrength.toFixed(3)
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.abs(pattern.correlationStrength || 0) < 0.2 && 'Small effect'}
                        {Math.abs(pattern.correlationStrength || 0) >= 0.2 && Math.abs(pattern.correlationStrength || 0) < 0.5 && 'Medium effect'}
                        {Math.abs(pattern.correlationStrength || 0) >= 0.5 && 'Large effect'}
                      </div>
                    </div>
                  </div>

                  {/* Last Updated */}
                  {pattern.lastUpdated && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-4">
                      Last updated: {new Date(pattern.lastUpdated).toLocaleString()}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Understanding Pattern Metrics
            </CardTitle>
          </CardHeader>
          <div className="p-6 space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <strong>Correlation Strength (Effect Size)</strong> measures how different your metrics are
              on migraine days vs normal days. This is calculated using Cohen's d:
            </p>
            <ul className="ml-6 space-y-1 list-disc">
              <li><strong>Small effect (&lt; 0.2):</strong> Subtle difference, may not be clinically significant</li>
              <li><strong>Medium effect (0.2 - 0.5):</strong> Noticeable difference, likely meaningful</li>
              <li><strong>Large effect (&gt; 0.5):</strong> Strong difference, highly significant</li>
            </ul>
            <p className="mt-3">
              <strong>Sample Size</strong> shows how many migraine days were analyzed. More migraine days
              generally lead to more reliable patterns, but the effect size matters more than quantity.
            </p>
            <p>
              <strong>Threshold Values</strong> are calculated based on your personal data. When a metric
              crosses this threshold, it suggests increased migraine risk.
            </p>
            <p className="pt-2 border-t">
              <em>Note:</em> These patterns are automatically updated when you visit the dashboard or calendar,
              and will be used to help predict your personalized migraine risk.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default PatternsPage;

