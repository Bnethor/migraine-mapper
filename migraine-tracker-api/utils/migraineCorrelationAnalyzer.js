import { query } from '../db/database.js';

/**
 * Analyze wearable data to find patterns that correlate with migraine days
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Analysis results with identified patterns
 */
export const analyzeMigraineCorrelations = async (userId) => {
  // Get all wearable data grouped by day
  const wearableDataResult = await query(
    `SELECT 
       DATE(timestamp) as date,
       AVG(stress_value) as avg_stress,
       MAX(stress_value) as max_stress,
       STDDEV(stress_value) as stress_volatility,
       AVG(recovery_value) as avg_recovery,
       MIN(recovery_value) as min_recovery,
       AVG(heart_rate) as avg_heart_rate,
       MIN(heart_rate) as resting_heart_rate,
       MAX(heart_rate) as max_heart_rate,
       AVG(hrv) as avg_hrv,
       STDDEV(hrv) as hrv_volatility,
       AVG(sleep_efficiency) as avg_sleep_efficiency,
       AVG(sleep_heart_rate) as avg_sleep_heart_rate,
       AVG(restless_periods) as avg_restless_periods,
       AVG(skin_temperature) as avg_skin_temp,
       COUNT(*) as data_points
     FROM wearable_data
     WHERE user_id = $1
     GROUP BY DATE(timestamp)
     ORDER BY DATE(timestamp)`,
    [userId]
  );

  // Get all migraine days
  const migraineDaysResult = await query(
    `SELECT date, is_migraine_day
     FROM migraine_day_markers
     WHERE user_id = $1 AND is_migraine_day = true
     ORDER BY date`,
    [userId]
  );

  const migraineDays = new Set(
    migraineDaysResult.rows.map(row => row.date.toISOString().split('T')[0])
  );

  // Separate days into migraine and non-migraine
  const migraineDayData = [];
  const normalDayData = [];

  wearableDataResult.rows.forEach(row => {
    const dateStr = typeof row.date === 'string' 
      ? row.date 
      : row.date.toISOString().split('T')[0];
    
    const dayData = {
      date: dateStr,
      avgStress: row.avg_stress ? parseFloat(row.avg_stress) : null,
      maxStress: row.max_stress ? parseFloat(row.max_stress) : null,
      stressVolatility: row.stress_volatility ? parseFloat(row.stress_volatility) : null,
      avgRecovery: row.avg_recovery ? parseFloat(row.avg_recovery) : null,
      minRecovery: row.min_recovery ? parseFloat(row.min_recovery) : null,
      avgHeartRate: row.avg_heart_rate ? parseFloat(row.avg_heart_rate) : null,
      restingHeartRate: row.resting_heart_rate ? parseFloat(row.resting_heart_rate) : null,
      maxHeartRate: row.max_heart_rate ? parseFloat(row.max_heart_rate) : null,
      avgHrv: row.avg_hrv ? parseFloat(row.avg_hrv) : null,
      hrvVolatility: row.hrv_volatility ? parseFloat(row.hrv_volatility) : null,
      avgSleepEfficiency: row.avg_sleep_efficiency ? parseFloat(row.avg_sleep_efficiency) : null,
      avgSleepHeartRate: row.avg_sleep_heart_rate ? parseFloat(row.avg_sleep_heart_rate) : null,
      avgRestlessPeriods: row.avg_restless_periods ? parseFloat(row.avg_restless_periods) : null,
      avgSkinTemp: row.avg_skin_temp ? parseFloat(row.avg_skin_temp) : null,
      dataPoints: parseInt(row.data_points) || 0
    };

    if (migraineDays.has(dateStr)) {
      migraineDayData.push(dayData);
    } else {
      normalDayData.push(dayData);
    }
  });

  if (migraineDayData.length === 0) {
    return {
      patterns: [],
      message: 'No migraine days found. Mark migraine days in the calendar to identify patterns.'
    };
  }

  if (normalDayData.length === 0) {
    return {
      patterns: [],
      message: 'Insufficient data. Need both migraine and non-migraine days for comparison.'
    };
  }

  // Helper function to calculate average
  const avg = (arr, key) => {
    const values = arr.map(d => d[key]).filter(v => v !== null && v !== undefined);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };

  // Helper function to calculate correlation (Cohen's d effect size)
  const calculateCorrelation = (migraineValues, normalValues) => {
    const migraineAvg = avg(migraineValues, 'value');
    const normalAvg = avg(normalValues, 'value');
    
    if (migraineAvg === null || normalAvg === null) return null;
    
    // Calculate difference in means
    const diff = migraineAvg - normalAvg;
    
    // Calculate pooled standard deviation (correct formula)
    const migraineVariance = migraineValues.reduce((s, v) => s + Math.pow(v.value - migraineAvg, 2), 0) / migraineValues.length;
    const normalVariance = normalValues.reduce((s, v) => s + Math.pow(v.value - normalAvg, 2), 0) / normalValues.length;
    const pooledVariance = (migraineValues.length * migraineVariance + normalValues.length * normalVariance) / 
                           (migraineValues.length + normalValues.length);
    const pooledStd = Math.sqrt(pooledVariance);
    
    if (pooledStd === 0) return 0;
    
    // Calculate Cohen's d (effect size)
    const cohensD = diff / pooledStd;
    
    // Convert to correlation-like value (-1 to 1 range)
    // Cohen's d typically ranges from -3 to 3, we'll normalize it
    // Small effect: 0.2, Medium: 0.5, Large: 0.8
    const correlation = Math.max(-1, Math.min(1, cohensD / 3));
    
    console.log(`Correlation analysis: diff=${diff.toFixed(2)}, pooledStd=${pooledStd.toFixed(2)}, cohensD=${cohensD.toFixed(3)}, correlation=${correlation.toFixed(3)}`);
    
    return correlation;
  };

  // Analyze patterns
  const patterns = [];

  // Pattern 1: High Stress
  const migraineStress = migraineDayData.map(d => ({ value: d.avgStress })).filter(d => d.value !== null);
  const normalStress = normalDayData.map(d => ({ value: d.avgStress })).filter(d => d.value !== null);
  if (migraineStress.length > 0 && normalStress.length > 0) {
    const migraineAvg = avg(migraineDayData, 'avgStress');
    const normalAvg = avg(normalDayData, 'avgStress');
    console.log(`Analyzing stress: migraine avg=${migraineAvg?.toFixed(2)}, normal avg=${normalAvg?.toFixed(2)}`);
    const correlation = calculateCorrelation(migraineStress, normalStress);
    
    // Lowered threshold from 0.2 to 0.05 for more sensitivity
    if (correlation !== null && Math.abs(correlation) > 0.05) {
      const threshold = normalAvg + (migraineAvg - normalAvg) * 0.7; // 70% of the way to migraine avg
      patterns.push({
        patternType: 'high_stress',
        patternName: 'High Average Stress',
        patternDefinition: {
          metric: 'avg_stress',
          operator: '>',
          threshold: threshold
        },
        correlationStrength: correlation,
        confidenceScore: Math.min(1, (migraineStress.length + normalStress.length) / 20), // More data = higher confidence
        migraineDaysCount: migraineStress.length,
        totalDaysAnalyzed: migraineStress.length + normalStress.length,
        avgValueOnMigraineDays: migraineAvg,
        avgValueOnNormalDays: normalAvg,
        thresholdValue: threshold
      });
    }
  }

  // Pattern 2: Stress Spikes (High Max Stress)
  const migraineMaxStress = migraineDayData.map(d => ({ value: d.maxStress })).filter(d => d.value !== null);
  const normalMaxStress = normalDayData.map(d => ({ value: d.maxStress })).filter(d => d.value !== null);
  if (migraineMaxStress.length > 0 && normalMaxStress.length > 0) {
    const migraineAvg = avg(migraineDayData, 'maxStress');
    const normalAvg = avg(normalDayData, 'maxStress');
    const correlation = calculateCorrelation(migraineMaxStress, normalMaxStress);
    
    if (correlation !== null && Math.abs(correlation) > 0.05) {
      const threshold = normalAvg + (migraineAvg - normalAvg) * 0.7;
      patterns.push({
        patternType: 'stress_spike',
        patternName: 'Stress Spikes',
        patternDefinition: {
          metric: 'max_stress',
          operator: '>',
          threshold: threshold
        },
        correlationStrength: correlation,
        confidenceScore: Math.min(1, (migraineMaxStress.length + normalMaxStress.length) / 20),
        migraineDaysCount: migraineMaxStress.length,
        totalDaysAnalyzed: migraineMaxStress.length + normalMaxStress.length,
        avgValueOnMigraineDays: migraineAvg,
        avgValueOnNormalDays: normalAvg,
        thresholdValue: threshold
      });
    }
  }

  // Pattern 3: Low Recovery
  const migraineRecovery = migraineDayData.map(d => ({ value: d.avgRecovery })).filter(d => d.value !== null);
  const normalRecovery = normalDayData.map(d => ({ value: d.avgRecovery })).filter(d => d.value !== null);
  if (migraineRecovery.length > 0 && normalRecovery.length > 0) {
    const migraineAvg = avg(migraineDayData, 'avgRecovery');
    const normalAvg = avg(normalDayData, 'avgRecovery');
    const correlation = calculateCorrelation(migraineRecovery, normalRecovery);
    
    if (correlation !== null && correlation < -0.05) { // Negative correlation (lower recovery = more migraines)
      const threshold = normalAvg - (normalAvg - migraineAvg) * 0.7;
      patterns.push({
        patternType: 'low_recovery',
        patternName: 'Low Recovery',
        patternDefinition: {
          metric: 'avg_recovery',
          operator: '<',
          threshold: threshold
        },
        correlationStrength: correlation,
        confidenceScore: Math.min(1, (migraineRecovery.length + normalRecovery.length) / 20),
        migraineDaysCount: migraineRecovery.length,
        totalDaysAnalyzed: migraineRecovery.length + normalRecovery.length,
        avgValueOnMigraineDays: migraineAvg,
        avgValueOnNormalDays: normalAvg,
        thresholdValue: threshold
      });
    }
  }

  // Pattern 4: Low HRV
  const migraineHrv = migraineDayData.map(d => ({ value: d.avgHrv })).filter(d => d.value !== null);
  const normalHrv = normalDayData.map(d => ({ value: d.avgHrv })).filter(d => d.value !== null);
  if (migraineHrv.length > 0 && normalHrv.length > 0) {
    const migraineAvg = avg(migraineDayData, 'avgHrv');
    const normalAvg = avg(normalDayData, 'avgHrv');
    const correlation = calculateCorrelation(migraineHrv, normalHrv);
    
    if (correlation !== null && correlation < -0.05) {
      const threshold = normalAvg - (normalAvg - migraineAvg) * 0.7;
      patterns.push({
        patternType: 'low_hrv',
        patternName: 'Low Heart Rate Variability',
        patternDefinition: {
          metric: 'avg_hrv',
          operator: '<',
          threshold: threshold
        },
        correlationStrength: correlation,
        confidenceScore: Math.min(1, (migraineHrv.length + normalHrv.length) / 20),
        migraineDaysCount: migraineHrv.length,
        totalDaysAnalyzed: migraineHrv.length + normalHrv.length,
        avgValueOnMigraineDays: migraineAvg,
        avgValueOnNormalDays: normalAvg,
        thresholdValue: threshold
      });
    }
  }

  // Pattern 5: Poor Sleep Efficiency
  const migraineSleep = migraineDayData.map(d => ({ value: d.avgSleepEfficiency })).filter(d => d.value !== null);
  const normalSleep = normalDayData.map(d => ({ value: d.avgSleepEfficiency })).filter(d => d.value !== null);
  if (migraineSleep.length > 0 && normalSleep.length > 0) {
    const migraineAvg = avg(migraineDayData, 'avgSleepEfficiency');
    const normalAvg = avg(normalDayData, 'avgSleepEfficiency');
    const correlation = calculateCorrelation(migraineSleep, normalSleep);
    
    if (correlation !== null && correlation < -0.05) {
      const threshold = normalAvg - (normalAvg - migraineAvg) * 0.7;
      patterns.push({
        patternType: 'poor_sleep',
        patternName: 'Poor Sleep Efficiency',
        patternDefinition: {
          metric: 'avg_sleep_efficiency',
          operator: '<',
          threshold: threshold
        },
        correlationStrength: correlation,
        confidenceScore: Math.min(1, (migraineSleep.length + normalSleep.length) / 20),
        migraineDaysCount: migraineSleep.length,
        totalDaysAnalyzed: migraineSleep.length + normalSleep.length,
        avgValueOnMigraineDays: migraineAvg,
        avgValueOnNormalDays: normalAvg,
        thresholdValue: threshold
      });
    }
  }

  // Pattern 6: High Stress Volatility
  const migraineStressVol = migraineDayData.map(d => ({ value: d.stressVolatility })).filter(d => d.value !== null);
  const normalStressVol = normalDayData.map(d => ({ value: d.stressVolatility })).filter(d => d.value !== null);
  if (migraineStressVol.length > 0 && normalStressVol.length > 0) {
    const migraineAvg = avg(migraineDayData, 'stressVolatility');
    const normalAvg = avg(normalDayData, 'stressVolatility');
    const correlation = calculateCorrelation(migraineStressVol, normalStressVol);
    
    if (correlation !== null && correlation > 0.05) {
      const threshold = normalAvg + (migraineAvg - normalAvg) * 0.7;
      patterns.push({
        patternType: 'stress_volatility',
        patternName: 'High Stress Volatility',
        patternDefinition: {
          metric: 'stress_volatility',
          operator: '>',
          threshold: threshold
        },
        correlationStrength: correlation,
        confidenceScore: Math.min(1, (migraineStressVol.length + normalStressVol.length) / 20),
        migraineDaysCount: migraineStressVol.length,
        totalDaysAnalyzed: migraineStressVol.length + normalStressVol.length,
        avgValueOnMigraineDays: migraineAvg,
        avgValueOnNormalDays: normalAvg,
        thresholdValue: threshold
      });
    }
  }

  return {
    patterns,
    migraineDaysCount: migraineDayData.length,
    normalDaysCount: normalDayData.length,
    totalDaysAnalyzed: migraineDayData.length + normalDayData.length
  };
};

/**
 * Save migraine correlation patterns to database
 * @param {string} userId - User ID
 * @param {Array} patterns - Array of pattern objects
 * @returns {Promise<Object>} Save results
 */
export const saveMigraineCorrelations = async (userId, patterns) => {
  const saved = [];
  const errors = [];

  for (const pattern of patterns) {
    try {
      const result = await query(
        `INSERT INTO migraine_correlations 
         (user_id, pattern_type, pattern_name, pattern_definition,
          correlation_strength, confidence_score, migraine_days_count, total_days_analyzed,
          avg_value_on_migraine_days, avg_value_on_normal_days, threshold_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (user_id, pattern_type) 
         DO UPDATE SET
           pattern_name = EXCLUDED.pattern_name,
           pattern_definition = EXCLUDED.pattern_definition,
           correlation_strength = EXCLUDED.correlation_strength,
           confidence_score = EXCLUDED.confidence_score,
           migraine_days_count = EXCLUDED.migraine_days_count,
           total_days_analyzed = EXCLUDED.total_days_analyzed,
           avg_value_on_migraine_days = EXCLUDED.avg_value_on_migraine_days,
           avg_value_on_normal_days = EXCLUDED.avg_value_on_normal_days,
           threshold_value = EXCLUDED.threshold_value,
           last_updated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, pattern_type`,
        [
          userId,
          pattern.patternType,
          pattern.patternName,
          JSON.stringify(pattern.patternDefinition),
          pattern.correlationStrength,
          pattern.confidenceScore,
          pattern.migraineDaysCount,
          pattern.totalDaysAnalyzed,
          pattern.avgValueOnMigraineDays,
          pattern.avgValueOnNormalDays,
          pattern.thresholdValue
        ]
      );
      
      saved.push(result.rows[0].pattern_type);
    } catch (error) {
      console.error(`Error saving pattern ${pattern.patternType}:`, error);
      errors.push({
        patternType: pattern.patternType,
        error: error.message
      });
    }
  }

  return {
    saved: saved.length,
    errors: errors.length,
    savedPatterns: saved,
    errorDetails: errors.length > 0 ? errors : undefined
  };
};

/**
 * Process and save migraine correlations for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Processing results
 */
export const processMigraineCorrelations = async (userId) => {
  try {
    const analysis = await analyzeMigraineCorrelations(userId);
    
    if (analysis.patterns.length === 0) {
      return {
        ...analysis,
        saved: 0,
        errors: 0
      };
    }

    const saveResult = await saveMigraineCorrelations(userId, analysis.patterns);
    
    return {
      ...analysis,
      ...saveResult
    };
  } catch (error) {
    console.error('Error processing migraine correlations:', error);
    throw error;
  }
};

