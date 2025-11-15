-- Migration: Create wearable_data table for storing CSV uploads from wearable devices
-- This table stores time-series data from devices like Oura Ring, Fitbit, etc.

-- Create wearable_data table
CREATE TABLE IF NOT EXISTS wearable_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Timestamp for the data point
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    -- Common wearable metrics (flexible - can be NULL if not available)
    stress_value NUMERIC(10, 2),
    recovery_value NUMERIC(10, 2),
    heart_rate NUMERIC(10, 2),
    hrv NUMERIC(10, 2), -- Heart Rate Variability
    sleep_efficiency NUMERIC(5, 2),
    sleep_heart_rate NUMERIC(10, 2),
    skin_temperature NUMERIC(5, 2),
    restless_periods NUMERIC(10, 2),
    -- Additional flexible fields stored as JSONB for extensibility
    additional_data JSONB,
    -- Metadata
    source VARCHAR(100), -- e.g., 'oura', 'fitbit', 'garmin', 'manual_upload'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wearable_data_user_id ON wearable_data(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_data_timestamp ON wearable_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_data_user_timestamp ON wearable_data(user_id, timestamp DESC);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_wearable_data_updated_at ON wearable_data;
CREATE TRIGGER update_wearable_data_updated_at
    BEFORE UPDATE ON wearable_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE wearable_data IS 'Time-series data from wearable devices for correlation with migraine episodes';
COMMENT ON COLUMN wearable_data.stress_value IS 'Stress level measurement (varies by device)';
COMMENT ON COLUMN wearable_data.recovery_value IS 'Recovery score (varies by device)';
COMMENT ON COLUMN wearable_data.heart_rate IS 'Heart rate in BPM';
COMMENT ON COLUMN wearable_data.hrv IS 'Heart Rate Variability in ms';
COMMENT ON COLUMN wearable_data.sleep_efficiency IS 'Sleep efficiency percentage';
COMMENT ON COLUMN wearable_data.sleep_heart_rate IS 'Average heart rate during sleep';
COMMENT ON COLUMN wearable_data.skin_temperature IS 'Skin temperature in Celsius';
COMMENT ON COLUMN wearable_data.restless_periods IS 'Number of restless periods during sleep';
COMMENT ON COLUMN wearable_data.additional_data IS 'Flexible JSONB field for device-specific metrics';
COMMENT ON COLUMN wearable_data.source IS 'Source device or upload method';

