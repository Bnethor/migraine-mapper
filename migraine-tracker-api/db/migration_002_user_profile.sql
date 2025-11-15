-- Migration: Create user profile table for clinical assessment
-- This stores patient characteristics separate from migraine episodes

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    -- Episode characteristics
    typical_duration INTEGER CHECK (typical_duration >= 1 AND typical_duration <= 3),
    monthly_frequency INTEGER CHECK (monthly_frequency >= 1 AND monthly_frequency <= 8),
    -- Pain characteristics
    typical_pain_location INTEGER DEFAULT 0 CHECK (typical_pain_location >= 0 AND typical_pain_location <= 2),
    typical_pain_character INTEGER DEFAULT 0 CHECK (typical_pain_character >= 0 AND typical_pain_character <= 2),
    typical_pain_intensity INTEGER DEFAULT 0 CHECK (typical_pain_intensity >= 0 AND typical_pain_intensity <= 3),
    -- Common symptoms
    experiences_nausea INTEGER DEFAULT 0 CHECK (experiences_nausea >= 0 AND experiences_nausea <= 1),
    experiences_vomit INTEGER DEFAULT 0 CHECK (experiences_vomit >= 0 AND experiences_vomit <= 1),
    experiences_phonophobia INTEGER DEFAULT 0 CHECK (experiences_phonophobia >= 0 AND experiences_phonophobia <= 1),
    experiences_photophobia INTEGER DEFAULT 0 CHECK (experiences_photophobia >= 0 AND experiences_photophobia <= 1),
    -- Aura symptoms
    typical_visual_symptoms INTEGER DEFAULT 0 CHECK (typical_visual_symptoms >= 0 AND typical_visual_symptoms <= 4),
    typical_sensory_symptoms INTEGER DEFAULT 0 CHECK (typical_sensory_symptoms >= 0 AND typical_sensory_symptoms <= 2),
    -- Neurological symptoms
    experiences_dysphasia INTEGER DEFAULT 0 CHECK (experiences_dysphasia >= 0 AND experiences_dysphasia <= 1),
    experiences_dysarthria INTEGER DEFAULT 0 CHECK (experiences_dysarthria >= 0 AND experiences_dysarthria <= 1),
    experiences_vertigo INTEGER DEFAULT 0 CHECK (experiences_vertigo >= 0 AND experiences_vertigo <= 1),
    experiences_tinnitus INTEGER DEFAULT 0 CHECK (experiences_tinnitus >= 0 AND experiences_tinnitus <= 1),
    experiences_hypoacusis INTEGER DEFAULT 0 CHECK (experiences_hypoacusis >= 0 AND experiences_hypoacusis <= 1),
    experiences_diplopia INTEGER DEFAULT 0 CHECK (experiences_diplopia >= 0 AND experiences_diplopia <= 1),
    experiences_defect INTEGER DEFAULT 0 CHECK (experiences_defect >= 0 AND experiences_defect <= 1),
    experiences_ataxia INTEGER DEFAULT 0 CHECK (experiences_ataxia >= 0 AND experiences_ataxia <= 1),
    experiences_conscience INTEGER DEFAULT 0 CHECK (experiences_conscience >= 0 AND experiences_conscience <= 1),
    experiences_paresthesia INTEGER DEFAULT 0 CHECK (experiences_paresthesia >= 0 AND experiences_paresthesia <= 1),
    -- Family and diagnosis
    family_history INTEGER DEFAULT 0 CHECK (family_history >= 0 AND family_history <= 1),
    diagnosed_type VARCHAR(100),
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Patient clinical profile - typical migraine characteristics';
COMMENT ON COLUMN user_profiles.typical_duration IS 'Typical duration of episodes in days (1-3)';
COMMENT ON COLUMN user_profiles.monthly_frequency IS 'Typical monthly episode frequency (1-8)';
COMMENT ON COLUMN user_profiles.typical_pain_location IS 'Typical pain location: 0=none, 1=unilateral, 2=bilateral';
COMMENT ON COLUMN user_profiles.typical_pain_character IS 'Typical pain character: 0=none, 1=throbbing, 2=persistent';
COMMENT ON COLUMN user_profiles.typical_pain_intensity IS 'Typical pain intensity: 0=none, 1=mild, 2=moderate, 3=severe';
COMMENT ON COLUMN user_profiles.family_history IS 'Family history of migraines: 0=no, 1=yes';
COMMENT ON COLUMN user_profiles.diagnosed_type IS 'Diagnosed migraine type';

-- Create profile for existing demo user
INSERT INTO user_profiles (user_id, monthly_frequency, typical_pain_intensity, experiences_photophobia, family_history)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 4, 2, 1, 1)
ON CONFLICT (user_id) DO NOTHING;

