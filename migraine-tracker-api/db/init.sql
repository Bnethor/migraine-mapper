-- Database initialization script for Migraine Tracker

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create migraine entries table
CREATE TABLE IF NOT EXISTS migraine_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
    location VARCHAR(255),
    triggers TEXT,
    symptoms TEXT,
    medication TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_migraine_entries_user_id ON migraine_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_migraine_entries_start_time ON migraine_entries(start_time DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to migraine_entries table
DROP TRIGGER IF EXISTS update_migraine_entries_updated_at ON migraine_entries;
CREATE TRIGGER update_migraine_entries_updated_at
    BEFORE UPDATE ON migraine_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert demo user (password: demo123)
-- Note: In production, passwords should be properly hashed
INSERT INTO users (id, email, name, password, created_at)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'demo@example.com', 'Demo User', 'demo123', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Add some sample migraine entries for the demo user
INSERT INTO migraine_entries (user_id, start_time, end_time, intensity, location, triggers, symptoms, medication, notes)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '4 days 20 hours', 7, 'Left temple', 'Stress, Lack of sleep', 'Nausea, Light sensitivity', 'Ibuprofen 400mg', 'Severe episode after project deadline'),
    ('550e8400-e29b-41d4-a716-446655440000', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '11 days 22 hours', 5, 'Right side', 'Weather change', 'Throbbing pain', 'Aspirin 500mg', 'Moderate pain during storm'),
    ('550e8400-e29b-41d4-a716-446655440000', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days 3 hours', 4, 'Forehead', 'Caffeine withdrawal', 'Dull ache', 'None', 'Mild headache, resolved naturally')
ON CONFLICT DO NOTHING;

-- Grant privileges (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migraineuser;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO migraineuser;



