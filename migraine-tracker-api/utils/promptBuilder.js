/**
 * AI Prompt Builder for Migraine Risk Analysis
 * Formats wearable data, correlation patterns, and user profile into a comprehensive prompt
 */

/**
 * Format wearable data for the prompt
 * @param {Array} wearableData - Last 24 hours of wearable data
 * @returns {string} Formatted wearable data section
 */
const formatWearableData = (wearableData) => {
  if (!wearableData || wearableData.length === 0) {
    return "No recent wearable data available.";
  }

  // Group by hour for better readability
  const hourlyData = wearableData.map(entry => {
    const timestamp = new Date(entry.timestamp);
    const hour = timestamp.getUTCHours();
    const date = timestamp.toISOString().split('T')[0];
    
    return {
      time: `${date} ${hour.toString().padStart(2, '0')}:00`,
      stress: entry.stress !== null ? entry.stress.toFixed(1) : 'N/A',
      recovery: entry.recovery !== null ? entry.recovery.toFixed(1) : 'N/A',
      hrv: entry.hrv !== null ? entry.hrv.toFixed(1) : 'N/A',
      heartRate: entry.heartRate !== null ? entry.heartRate.toFixed(0) : 'N/A',
      sleepEfficiency: entry.sleepEfficiency !== null ? entry.sleepEfficiency.toFixed(1) : 'N/A',
      skinTemp: entry.skinTemperature !== null ? entry.skinTemperature.toFixed(1) : 'N/A'
    };
  });

  // Calculate 24h averages
  const validStress = wearableData.filter(d => d.stress !== null).map(d => d.stress);
  const validRecovery = wearableData.filter(d => d.recovery !== null).map(d => d.recovery);
  const validHrv = wearableData.filter(d => d.hrv !== null).map(d => d.hrv);
  const validHr = wearableData.filter(d => d.heartRate !== null).map(d => d.heartRate);
  
  const avg = arr => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 'N/A';
  
  const summary = {
    avgStress: avg(validStress),
    maxStress: validStress.length > 0 ? Math.max(...validStress).toFixed(1) : 'N/A',
    avgRecovery: avg(validRecovery),
    minRecovery: validRecovery.length > 0 ? Math.min(...validRecovery).toFixed(1) : 'N/A',
    avgHrv: avg(validHrv),
    avgHeartRate: avg(validHr),
    dataPoints: wearableData.length
  };

  return `
## Last 24 Hours Wearable Data Summary

**Overall Metrics (Last 24 Hours):**
- Average Stress Level: ${summary.avgStress} (Max: ${summary.maxStress})
- Average Recovery Score: ${summary.avgRecovery} (Min: ${summary.minRecovery})
- Average Heart Rate Variability (HRV): ${summary.avgHrv} ms
- Average Heart Rate: ${summary.avgHeartRate} bpm
- Total Data Points: ${summary.dataPoints}

**Recent Hourly Trends (Last 6 Hours):**
${hourlyData.slice(-6).map(h => 
  `- ${h.time}: Stress=${h.stress}, Recovery=${h.recovery}, HRV=${h.hrv}ms, HR=${h.heartRate}bpm`
).join('\n')}
`;
};

/**
 * Format correlation patterns for the prompt
 * @param {Array} patterns - Migraine correlation patterns
 * @returns {string} Formatted correlation patterns section
 */
const formatCorrelationPatterns = (patterns) => {
  if (!patterns || patterns.length === 0) {
    return "No historical migraine correlation patterns identified yet.";
  }

  // Sort by correlation strength
  const sortedPatterns = patterns
    .filter(p => p.correlationStrength && Math.abs(p.correlationStrength) > 0.1)
    .sort((a, b) => Math.abs(b.correlationStrength) - Math.abs(a.correlationStrength))
    .slice(0, 10); // Top 10 patterns

  if (sortedPatterns.length === 0) {
    return "No significant correlation patterns found.";
  }

  const patternDescriptions = sortedPatterns.map(p => {
    const strength = Math.abs(p.correlationStrength);
    const direction = p.correlationStrength > 0 ? 'higher' : 'lower';
    const effectSize = strength > 0.3 ? 'strong' : strength > 0.15 ? 'moderate' : 'weak';
    
    return `- **${p.patternName}** (${effectSize} correlation): On migraine days, this metric is typically ${direction} (avg: ${p.avgValueOnMigraineDays?.toFixed(1)} vs normal: ${p.avgValueOnNormalDays?.toFixed(1)}). Based on ${p.migraineDaysCount} migraine days analyzed.`;
  }).join('\n');

  return `
## Historical Migraine Correlation Patterns

Based on analysis of ${patterns[0]?.totalDaysAnalyzed || 0} days of data with ${patterns[0]?.migraineDaysCount || 0} confirmed migraine days:

${patternDescriptions}
`;
};

/**
 * Format user profile for the prompt
 * @param {Object} profile - User migraine profile
 * @returns {string} Formatted profile section
 */
const formatUserProfile = (profile) => {
  if (!profile) {
    return "No user profile information available.";
  }

  const migraineType = profile.diagnosedType || 'Not specified';
  const frequency = profile.monthlyFrequency ? `${profile.monthlyFrequency} per month` : 'Not specified';
  const duration = profile.typicalDuration ? `${profile.typicalDuration} hours` : 'Not specified';
  
  // Format symptoms
  const symptoms = [];
  if (profile.experiencesNausea) symptoms.push('nausea');
  if (profile.experiencesVomit) symptoms.push('vomiting');
  if (profile.experiencesPhotophobia) symptoms.push('light sensitivity');
  if (profile.experiencesPhonophobia) symptoms.push('sound sensitivity');
  if (profile.typicalVisualSymptoms) symptoms.push('visual aura');
  if (profile.typicalSensorySymptoms) symptoms.push('sensory aura');
  
  const symptomsText = symptoms.length > 0 ? symptoms.join(', ') : 'None specified';

  return `
## User Profile & Migraine History

**Migraine Type:** ${migraineType}
**Typical Frequency:** ${frequency}
**Typical Duration:** ${duration}
**Common Symptoms:** ${symptomsText}
**Family History:** ${profile.familyHistory ? 'Yes' : 'No'}
`;
};

/**
 * Build complete AI prompt for migraine risk analysis
 * @param {Object} data - Complete data object
 * @param {Array} data.wearableData - Last 24 hours of wearable data
 * @param {Array} data.patterns - Correlation patterns
 * @param {Object} data.profile - User profile
 * @returns {string} Complete formatted prompt
 */
export const buildRiskAnalysisPrompt = (data) => {
  const { wearableData, patterns, profile } = data;

  const prompt = `# Migraine Risk Analysis Request

You are an expert migraine specialist analyzing wearable device data to predict migraine risk. Based on the following information, provide a comprehensive 12-hour migraine risk assessment.

${formatUserProfile(profile)}

${formatWearableData(wearableData)}

${formatCorrelationPatterns(patterns)}

## Instructions

Please analyze the above data and provide:

1. **Risk Level (0-100%):** Overall migraine probability in the next 12 hours
2. **Risk Category:** Low (0-25%), Moderate (25-50%), High (50-75%), Very High (75-100%)
3. **Key Risk Factors:** List the top 3-5 metrics or patterns that are contributing to the risk
4. **Trend Analysis:** How current metrics compare to the user's historical migraine patterns
5. **Recommendations:** Specific preventive actions the user should consider
6. **Confidence Level:** How confident you are in this assessment (Low/Medium/High)

Please provide a clear, actionable analysis that a migraine sufferer can understand and act upon. Focus on comparing current metrics to the user's historical patterns that have correlated with migraines.

Format your response in a clear, structured way with sections for each of the above points.`;

  return prompt;
};

/**
 * Build a simple summary for display
 * @param {Object} data - Complete data object
 * @returns {Object} Summary statistics
 */
export const buildDataSummary = (data) => {
  const { wearableData, patterns, profile } = data;
  
  return {
    hasWearableData: wearableData && wearableData.length > 0,
    dataPoints: wearableData?.length || 0,
    patternCount: patterns?.length || 0,
    migraineType: profile?.diagnosedType || 'Unknown',
    timeRange: wearableData && wearableData.length > 0 ? {
      start: wearableData[0]?.timestamp,
      end: wearableData[wearableData.length - 1]?.timestamp
    } : null
  };
};

