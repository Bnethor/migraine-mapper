-- Migration: Create summary_indicators table for storing processed wearable data metrics
-- These indicators are calculated from wearable data and used for migraine risk prediction

-- Create summary_indicators table
CREATE TABLE IF NOT EXISTS summary_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Time period for this summary
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    -- Stress indicators
    avg_stress NUMERIC(10, 2),
    max_stress NUMERIC(10, 2),
    stress_volatility NUMERIC(10, 2), -- Standard deviation or variance
    stress_trend VARCHAR(20), -- 'increasing', 'decreasing', 'stable'
    -- Recovery indicators
    avg_recovery NUMERIC(10, 2),
    min_recovery NUMERIC(10, 2),
    recovery_trend VARCHAR(20),
    -- Heart rate indicators
    avg_heart_rate NUMERIC(10, 2),
    resting_heart_rate NUMERIC(10, 2),
    max_heart_rate NUMERIC(10, 2),
    heart_rate_variability NUMERIC(10, 2), -- HRV metrics
    -- HRV specific indicators
    avg_hrv NUMERIC(10, 2),
    hrv_trend VARCHAR(20),
    hrv_volatility NUMERIC(10, 2),
    -- Sleep indicators
    avg_sleep_efficiency NUMERIC(5, 2),
    avg_sleep_heart_rate NUMERIC(10, 2),
    avg_restless_periods NUMERIC(10, 2),
    -- Temperature indicators
    avg_skin_temperature NUMERIC(5, 2),
    temperature_variation NUMERIC(5, 2),
    -- Composite indicators
    overall_wellness_score NUMERIC(5, 2), -- Calculated composite score
    risk_factors JSONB, -- Array of identified risk factors
    -- Metadata
    data_points_count INTEGER NOT NULL DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure one summary per user per time period (e.g., daily)
    UNIQUE(user_id, period_start, period_end)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_summary_indicators_user_id ON summary_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_summary_indicators_period ON summary_indicators(period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_summary_indicators_user_period ON summary_indicators(user_id, period_start DESC);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_summary_indicators_updated_at ON summary_indicators;
CREATE TRIGGER update_summary_indicators_updated_at
    BEFORE UPDATE ON summary_indicators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE summary_indicators IS 'Processed summary indicators from wearable data for migraine risk prediction';
COMMENT ON COLUMN summary_indicators.period_start IS 'Start of the time period this summary covers';
COMMENT ON COLUMN summary_indicators.period_end IS 'End of the time period this summary covers';
COMMENT ON COLUMN summary_indicators.stress_volatility IS 'Measure of stress variability (standard deviation)';
COMMENT ON COLUMN summary_indicators.stress_trend IS 'Trend direction: increasing, decreasing, or stable';
COMMENT ON COLUMN summary_indicators.overall_wellness_score IS 'Composite score (0-100) indicating overall wellness';
COMMENT ON COLUMN summary_indicators.risk_factors IS 'JSON array of identified risk factors for migraines';

