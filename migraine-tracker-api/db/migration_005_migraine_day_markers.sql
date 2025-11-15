-- Migration: Create migraine_day_markers table for tracking user-reported migraine days
-- This allows users to mark specific days as migraine days in the calendar

-- Create migraine_day_markers table
CREATE TABLE IF NOT EXISTS migraine_day_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_migraine_day BOOLEAN NOT NULL DEFAULT true,
    severity INTEGER CHECK (severity >= 1 AND severity <= 10), -- Optional severity rating
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_migraine_day_markers_user_id ON migraine_day_markers(user_id);
CREATE INDEX IF NOT EXISTS idx_migraine_day_markers_date ON migraine_day_markers(date DESC);
CREATE INDEX IF NOT EXISTS idx_migraine_day_markers_user_date ON migraine_day_markers(user_id, date DESC);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_migraine_day_markers_updated_at ON migraine_day_markers;
CREATE TRIGGER update_migraine_day_markers_updated_at
    BEFORE UPDATE ON migraine_day_markers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE migraine_day_markers IS 'User-reported migraine day markers for calendar view';
COMMENT ON COLUMN migraine_day_markers.date IS 'Date of the migraine day (DATE only, no time)';
COMMENT ON COLUMN migraine_day_markers.is_migraine_day IS 'Whether this day is marked as a migraine day';
COMMENT ON COLUMN migraine_day_markers.severity IS 'Optional severity rating (1-10)';
COMMENT ON COLUMN migraine_day_markers.notes IS 'Optional notes about the migraine day';

