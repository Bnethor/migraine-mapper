-- Migration: Add upload session tracking for wearable data uploads
-- This allows users to track and manage their CSV uploads

-- Create upload_sessions table
CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    source VARCHAR(100), -- e.g., 'oura', 'fitbit', 'garmin', 'manual_upload'
    total_rows INTEGER NOT NULL DEFAULT 0,
    inserted_rows INTEGER NOT NULL DEFAULT 0,
    updated_rows INTEGER NOT NULL DEFAULT 0,
    skipped_rows INTEGER NOT NULL DEFAULT 0,
    error_rows INTEGER NOT NULL DEFAULT 0,
    field_mapping JSONB,
    unrecognized_fields TEXT[],
    status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'failed', 'partial'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add upload_session_id to wearable_data table
ALTER TABLE wearable_data 
ADD COLUMN IF NOT EXISTS upload_session_id UUID REFERENCES upload_sessions(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_id ON upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_created_at ON upload_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_data_upload_session_id ON wearable_data(upload_session_id);

-- Add unique constraint for duplicate detection (user_id + timestamp)
-- This prevents duplicate entries for the same timestamp
CREATE UNIQUE INDEX IF NOT EXISTS idx_wearable_data_user_timestamp_unique 
ON wearable_data(user_id, timestamp);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_upload_sessions_updated_at ON upload_sessions;
CREATE TRIGGER update_upload_sessions_updated_at
    BEFORE UPDATE ON upload_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE upload_sessions IS 'Tracks CSV file uploads for wearable data';
COMMENT ON COLUMN upload_sessions.filename IS 'Original filename of uploaded CSV';
COMMENT ON COLUMN upload_sessions.file_size IS 'File size in bytes';
COMMENT ON COLUMN upload_sessions.total_rows IS 'Total number of rows in CSV';
COMMENT ON COLUMN upload_sessions.inserted_rows IS 'Number of new rows inserted';
COMMENT ON COLUMN upload_sessions.updated_rows IS 'Number of existing rows updated';
COMMENT ON COLUMN upload_sessions.skipped_rows IS 'Number of duplicate rows skipped';
COMMENT ON COLUMN upload_sessions.error_rows IS 'Number of rows that failed to process';
COMMENT ON COLUMN upload_sessions.field_mapping IS 'JSON mapping of CSV columns to database fields';
COMMENT ON COLUMN upload_sessions.status IS 'Upload status: completed, failed, or partial';
COMMENT ON COLUMN wearable_data.upload_session_id IS 'Reference to the upload session that created this record';

