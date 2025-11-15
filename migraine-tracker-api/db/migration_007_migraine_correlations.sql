-- Migration: Create migraine_correlations table for storing patterns that correlate with migraines
-- These patterns are identified by analyzing wearable data on migraine days vs non-migraine days

-- Create migraine_correlations table
CREATE TABLE IF NOT EXISTS migraine_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Pattern identifier
    pattern_type VARCHAR(50) NOT NULL, -- e.g., 'high_stress', 'low_hrv', 'stress_spike', etc.
    pattern_name VARCHAR(100) NOT NULL, -- Human-readable name
    -- Pattern definition (thresholds, conditions)
    pattern_definition JSONB NOT NULL, -- Stores thresholds, conditions, etc.
    -- Correlation metrics
    correlation_strength NUMERIC(5, 3), -- -1 to 1, how strongly correlated
    confidence_score NUMERIC(5, 3), -- 0 to 1, confidence in the correlation
    migraine_days_count INTEGER NOT NULL DEFAULT 0, -- How many migraine days had this pattern
    total_days_analyzed INTEGER NOT NULL DEFAULT 0, -- Total days analyzed
    -- Pattern details
    avg_value_on_migraine_days NUMERIC(10, 2), -- Average value on migraine days
    avg_value_on_normal_days NUMERIC(10, 2), -- Average value on normal days
    threshold_value NUMERIC(10, 2), -- Threshold that indicates risk
    -- Metadata
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure one pattern per user per pattern type
    UNIQUE(user_id, pattern_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_migraine_correlations_user_id ON migraine_correlations(user_id);
CREATE INDEX IF NOT EXISTS idx_migraine_correlations_pattern_type ON migraine_correlations(pattern_type);
CREATE INDEX IF NOT EXISTS idx_migraine_correlations_user_pattern ON migraine_correlations(user_id, pattern_type);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_migraine_correlations_updated_at ON migraine_correlations;
CREATE TRIGGER update_migraine_correlations_updated_at
    BEFORE UPDATE ON migraine_correlations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE migraine_correlations IS 'Patterns that correlate with migraine days for each user';
COMMENT ON COLUMN migraine_correlations.pattern_type IS 'Type of pattern (e.g., high_stress, low_hrv, stress_spike)';
COMMENT ON COLUMN migraine_correlations.pattern_definition IS 'JSON definition of the pattern (thresholds, conditions)';
COMMENT ON COLUMN migraine_correlations.correlation_strength IS 'Correlation coefficient (-1 to 1)';
COMMENT ON COLUMN migraine_correlations.confidence_score IS 'Confidence in the correlation (0 to 1)';
COMMENT ON COLUMN migraine_correlations.threshold_value IS 'Threshold value that indicates increased risk';

