import { query } from '../db/database.js';
import { processMigraineCorrelations } from './migraineCorrelationAnalyzer.js';

/**
 * Calculate summary indicators from wearable data for a given time period
 * @param {string} userId - User ID
 * @param {Date} periodStart - Start of the period
 * @param {Date} periodEnd - End of the period
 * @returns {Promise<Object>} Summary indicators object
 */
export const calculateSummaryIndicators = async (userId, periodStart, periodEnd) => {
  // Get all wearable data for the period
  const dataResult = await query(
    `SELECT timestamp, stress_value, recovery_value, heart_rate, hrv,
            sleep_efficiency, sleep_heart_rate, skin_temperature, restless_periods
     FROM wearable_data
     WHERE user_id = $1 
       AND timestamp >= $2 
       AND timestamp <= $3
     ORDER BY timestamp`,
    [userId, periodStart, periodEnd]
  );

  const dataPoints = dataResult.rows;
  
  if (dataPoints.length === 0) {
    return null; // No data to process
  }

  // Extract arrays of values (filtering out nulls)
  const stressValues = dataPoints.map(r => r.stress_value).filter(v => v !== null && v !== undefined);
  const recoveryValues = dataPoints.map(r => r.recovery_value).filter(v => v !== null && v !== undefined);
  const heartRates = dataPoints.map(r => r.heart_rate).filter(v => v !== null && v !== undefined);
  const hrvValues = dataPoints.map(r => r.hrv).filter(v => v !== null && v !== undefined);
  const sleepEfficiencies = dataPoints.map(r => r.sleep_efficiency).filter(v => v !== null && v !== undefined);
  const sleepHeartRates = dataPoints.map(r => r.sleep_heart_rate).filter(v => v !== null && v !== undefined);
  const skinTemps = dataPoints.map(r => r.skin_temperature).filter(v => v !== null && v !== undefined);
  const restlessPeriods = dataPoints.map(r => r.restless_periods).filter(v => v !== null && v !== undefined);

  // Helper function to calculate average
  const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  
  // Helper function to calculate standard deviation
  const stdDev = (arr) => {
    if (arr.length === 0) return null;
    const mean = avg(arr);
    const squaredDiffs = arr.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(avg(squaredDiffs));
  };

  // Helper function to calculate trend
  const calculateTrend = (values) => {
    if (values.length < 2) return 'stable';
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = avg(firstHalf);
    const secondAvg = avg(secondHalf);
    const diff = secondAvg - firstAvg;
    const threshold = firstAvg * 0.05; // 5% change threshold
    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  };

  // Calculate stress indicators
  const avgStress = avg(stressValues);
  const maxStress = stressValues.length > 0 ? Math.max(...stressValues) : null;
  const stressVolatility = stdDev(stressValues);
  const stressTrend = calculateTrend(stressValues);

  // Calculate recovery indicators
  const avgRecovery = avg(recoveryValues);
  const minRecovery = recoveryValues.length > 0 ? Math.min(...recoveryValues) : null;
  const recoveryTrend = calculateTrend(recoveryValues);

  // Calculate heart rate indicators
  const avgHeartRate = avg(heartRates);
  const restingHeartRate = heartRates.length > 0 ? Math.min(...heartRates) : null;
  const maxHeartRate = heartRates.length > 0 ? Math.max(...heartRates) : null;
  
  // Calculate HRV indicators
  const avgHrv = avg(hrvValues);
  const hrvTrend = calculateTrend(hrvValues);
  const hrvVolatility = stdDev(hrvValues);

  // Calculate sleep indicators
  const avgSleepEfficiency = avg(sleepEfficiencies);
  const avgSleepHeartRate = avg(sleepHeartRates);
  const avgRestlessPeriods = avg(restlessPeriods);

  // Calculate temperature indicators
  const avgSkinTemp = avg(skinTemps);
  const tempVariation = skinTemps.length > 0 
    ? Math.max(...skinTemps) - Math.min(...skinTemps) 
    : null;

  // Calculate overall wellness score (0-100)
  // Higher score = better wellness
  let wellnessScore = 50; // Base score
  
  // Stress component (lower is better, 0-30 range typical)
  if (avgStress !== null) {
    const stressScore = Math.max(0, 30 - avgStress) / 30 * 25; // Up to 25 points
    wellnessScore += stressScore;
  }
  
  // Recovery component (higher is better, 0-100 range typical)
  if (avgRecovery !== null) {
    const recoveryScore = avgRecovery / 100 * 25; // Up to 25 points
    wellnessScore += recoveryScore;
  }
  
  // Sleep efficiency component
  if (avgSleepEfficiency !== null) {
    const sleepScore = avgSleepEfficiency / 100 * 25; // Up to 25 points
    wellnessScore += sleepScore;
  }
  
  // HRV component (higher is generally better, but varies by person)
  if (avgHrv !== null) {
    // Normalize HRV (assuming 20-80ms is typical range)
    const normalizedHrv = Math.min(100, Math.max(0, (avgHrv - 20) / 60 * 100));
    const hrvScore = normalizedHrv / 100 * 25; // Up to 25 points
    wellnessScore += hrvScore;
  }
  
  wellnessScore = Math.min(100, Math.max(0, wellnessScore));

  // Identify risk factors
  const riskFactors = [];
  
  if (avgStress !== null && avgStress > 25) {
    riskFactors.push({ type: 'high_stress', value: avgStress, severity: 'moderate' });
  }
  if (avgStress !== null && avgStress > 35) {
    riskFactors.push({ type: 'very_high_stress', value: avgStress, severity: 'high' });
  }
  
  if (avgRecovery !== null && avgRecovery < 30) {
    riskFactors.push({ type: 'low_recovery', value: avgRecovery, severity: 'moderate' });
  }
  
  if (avgHrv !== null && avgHrv < 30) {
    riskFactors.push({ type: 'low_hrv', value: avgHrv, severity: 'moderate' });
  }
  
  if (avgSleepEfficiency !== null && avgSleepEfficiency < 80) {
    riskFactors.push({ type: 'poor_sleep', value: avgSleepEfficiency, severity: 'moderate' });
  }
  
  if (stressVolatility !== null && stressVolatility > 5) {
    riskFactors.push({ type: 'stress_volatility', value: stressVolatility, severity: 'moderate' });
  }
  
  if (stressTrend === 'increasing') {
    riskFactors.push({ type: 'increasing_stress', severity: 'moderate' });
  }
  
  if (recoveryTrend === 'decreasing') {
    riskFactors.push({ type: 'decreasing_recovery', severity: 'moderate' });
  }

  return {
    periodStart,
    periodEnd,
    avgStress,
    maxStress,
    stressVolatility,
    stressTrend,
    avgRecovery,
    minRecovery,
    recoveryTrend,
    avgHeartRate,
    restingHeartRate,
    maxHeartRate,
    avgHrv,
    hrvTrend,
    hrvVolatility,
    avgSleepEfficiency,
    avgSleepHeartRate,
    avgRestlessPeriods,
    avgSkinTemp,
    tempVariation,
    overallWellnessScore: Math.round(wellnessScore * 100) / 100,
    riskFactors: riskFactors.length > 0 ? riskFactors : null,
    dataPointsCount: dataPoints.length
  };
};

/**
 * Process and save summary indicators for a user
 * Processes daily summaries for the last 30 days or until last processed date
 * @param {string} userId - User ID
 * @param {boolean} forceReprocess - Force reprocessing even if already processed
 * @returns {Promise<Object>} Processing results
 */
export const processSummaryIndicators = async (userId, forceReprocess = false) => {
  try {
    // Check when we last processed for this user
    let lastProcessedDate = null;
    if (!forceReprocess) {
      const lastResult = await query(
        `SELECT MAX(period_end) as last_end
         FROM summary_indicators
         WHERE user_id = $1`,
        [userId]
      );
      if (lastResult.rows[0]?.last_end) {
        lastProcessedDate = new Date(lastResult.rows[0].last_end);
      }
    }

    // Get date range to process (last 30 days or since last processed)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    if (lastProcessedDate) {
      // Process from day after last processed
      startDate.setTime(lastProcessedDate.getTime() + 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Process last 30 days
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    // Process each day
    const processedDays = [];
    const errors = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      try {
        const indicators = await calculateSummaryIndicators(userId, dayStart, dayEnd);
        
        if (indicators) {
          // Check if summary already exists
          const existing = await query(
            `SELECT id FROM summary_indicators
             WHERE user_id = $1 AND period_start = $2 AND period_end = $3`,
            [userId, dayStart, dayEnd]
          );

          if (existing.rows.length > 0) {
            // Update existing
            await query(
              `UPDATE summary_indicators SET
                avg_stress = $1, max_stress = $2, stress_volatility = $3, stress_trend = $4,
                avg_recovery = $5, min_recovery = $6, recovery_trend = $7,
                avg_heart_rate = $8, resting_heart_rate = $9, max_heart_rate = $10,
                avg_hrv = $11, hrv_trend = $12, hrv_volatility = $13,
                avg_sleep_efficiency = $14, avg_sleep_heart_rate = $15, avg_restless_periods = $16,
                avg_skin_temperature = $17, temperature_variation = $18,
                overall_wellness_score = $19, risk_factors = $20,
                data_points_count = $21, updated_at = CURRENT_TIMESTAMP
               WHERE user_id = $22 AND period_start = $23 AND period_end = $24`,
              [
                indicators.avgStress,
                indicators.maxStress,
                indicators.stressVolatility,
                indicators.stressTrend,
                indicators.avgRecovery,
                indicators.minRecovery,
                indicators.recoveryTrend,
                indicators.avgHeartRate,
                indicators.restingHeartRate,
                indicators.maxHeartRate,
                indicators.avgHrv,
                indicators.hrvTrend,
                indicators.hrvVolatility,
                indicators.avgSleepEfficiency,
                indicators.avgSleepHeartRate,
                indicators.avgRestlessPeriods,
                indicators.avgSkinTemp,
                indicators.tempVariation,
                indicators.overallWellnessScore,
                indicators.riskFactors ? JSON.stringify(indicators.riskFactors) : null,
                indicators.dataPointsCount,
                userId,
                dayStart,
                dayEnd
              ]
            );
          } else {
            // Insert new
            await query(
              `INSERT INTO summary_indicators 
               (user_id, period_start, period_end,
                avg_stress, max_stress, stress_volatility, stress_trend,
                avg_recovery, min_recovery, recovery_trend,
                avg_heart_rate, resting_heart_rate, max_heart_rate,
                avg_hrv, hrv_trend, hrv_volatility,
                avg_sleep_efficiency, avg_sleep_heart_rate, avg_restless_periods,
                avg_skin_temperature, temperature_variation,
                overall_wellness_score, risk_factors, data_points_count)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
              [
                userId,
                dayStart,
                dayEnd,
                indicators.avgStress,
                indicators.maxStress,
                indicators.stressVolatility,
                indicators.stressTrend,
                indicators.avgRecovery,
                indicators.minRecovery,
                indicators.recoveryTrend,
                indicators.avgHeartRate,
                indicators.restingHeartRate,
                indicators.maxHeartRate,
                indicators.avgHrv,
                indicators.hrvTrend,
                indicators.hrvVolatility,
                indicators.avgSleepEfficiency,
                indicators.avgSleepHeartRate,
                indicators.avgRestlessPeriods,
                indicators.avgSkinTemp,
                indicators.tempVariation,
                indicators.overallWellnessScore,
                indicators.riskFactors ? JSON.stringify(indicators.riskFactors) : null,
                indicators.dataPointsCount
              ]
            );
          }
          
          processedDays.push(dayStart.toISOString().split('T')[0]);
        }
      } catch (error) {
        console.error(`Error processing day ${dayStart.toISOString().split('T')[0]}:`, error);
        errors.push({
          date: dayStart.toISOString().split('T')[0],
          error: error.message
        });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Analyze migraine correlations (always run this to update patterns)
    let correlationResults = null;
    try {
      correlationResults = await processMigraineCorrelations(userId);
    } catch (error) {
      console.error('Error processing migraine correlations:', error);
      // Don't fail the whole process if correlation analysis fails
    }

    return {
      processed: processedDays.length,
      errors: errors.length,
      processedDays,
      errorDetails: errors.length > 0 ? errors : undefined,
      lastProcessedDate: endDate.toISOString(),
      correlations: correlationResults
    };
  } catch (error) {
    console.error('Error processing summary indicators:', error);
    throw error;
  }
};

