-- Migration: Add comprehensive clinical migraine assessment fields
-- Run this on existing databases to add new columns

-- Add clinical assessment fields
ALTER TABLE migraine_entries 
ADD COLUMN IF NOT EXISTS duration INTEGER CHECK (duration >= 1 AND duration <= 3),
ADD COLUMN IF NOT EXISTS frequency INTEGER CHECK (frequency >= 1 AND frequency <= 8),
ADD COLUMN IF NOT EXISTS pain_location INTEGER DEFAULT 0 CHECK (pain_location >= 0 AND pain_location <= 2),
ADD COLUMN IF NOT EXISTS pain_character INTEGER DEFAULT 0 CHECK (pain_character >= 0 AND pain_character <= 2),
ADD COLUMN IF NOT EXISTS pain_intensity INTEGER DEFAULT 0 CHECK (pain_intensity >= 0 AND pain_intensity <= 3),
ADD COLUMN IF NOT EXISTS nausea INTEGER DEFAULT 0 CHECK (nausea >= 0 AND nausea <= 1),
ADD COLUMN IF NOT EXISTS vomit INTEGER DEFAULT 0 CHECK (vomit >= 0 AND vomit <= 1),
ADD COLUMN IF NOT EXISTS phonophobia INTEGER DEFAULT 0 CHECK (phonophobia >= 0 AND phonophobia <= 1),
ADD COLUMN IF NOT EXISTS photophobia INTEGER DEFAULT 0 CHECK (photophobia >= 0 AND photophobia <= 1),
ADD COLUMN IF NOT EXISTS visual INTEGER DEFAULT 0 CHECK (visual >= 0 AND visual <= 4),
ADD COLUMN IF NOT EXISTS sensory INTEGER DEFAULT 0 CHECK (sensory >= 0 AND sensory <= 2),
ADD COLUMN IF NOT EXISTS dysphasia INTEGER DEFAULT 0 CHECK (dysphasia >= 0 AND dysphasia <= 1),
ADD COLUMN IF NOT EXISTS dysarthria INTEGER DEFAULT 0 CHECK (dysarthria >= 0 AND dysarthria <= 1),
ADD COLUMN IF NOT EXISTS vertigo INTEGER DEFAULT 0 CHECK (vertigo >= 0 AND vertigo <= 1),
ADD COLUMN IF NOT EXISTS tinnitus INTEGER DEFAULT 0 CHECK (tinnitus >= 0 AND tinnitus <= 1),
ADD COLUMN IF NOT EXISTS hypoacusis INTEGER DEFAULT 0 CHECK (hypoacusis >= 0 AND hypoacusis <= 1),
ADD COLUMN IF NOT EXISTS diplopia INTEGER DEFAULT 0 CHECK (diplopia >= 0 AND diplopia <= 1),
ADD COLUMN IF NOT EXISTS defect INTEGER DEFAULT 0 CHECK (defect >= 0 AND defect <= 1),
ADD COLUMN IF NOT EXISTS ataxia INTEGER DEFAULT 0 CHECK (ataxia >= 0 AND ataxia <= 1),
ADD COLUMN IF NOT EXISTS conscience INTEGER DEFAULT 0 CHECK (conscience >= 0 AND conscience <= 1),
ADD COLUMN IF NOT EXISTS paresthesia INTEGER DEFAULT 0 CHECK (paresthesia >= 0 AND paresthesia <= 1),
ADD COLUMN IF NOT EXISTS dpf INTEGER DEFAULT 0 CHECK (dpf >= 0 AND dpf <= 1),
ADD COLUMN IF NOT EXISTS migraine_type VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN migraine_entries.duration IS 'Length of symptoms during most recent episode in days (1-3)';
COMMENT ON COLUMN migraine_entries.frequency IS 'Monthly episode frequency (1-8)';
COMMENT ON COLUMN migraine_entries.pain_location IS 'Pain location: 0=none, 1=unilateral, 2=bilateral';
COMMENT ON COLUMN migraine_entries.pain_character IS 'Pain character: 0=none, 1=throbbing, 2=persistent';
COMMENT ON COLUMN migraine_entries.pain_intensity IS 'Pain intensity: 0=none, 1=mild, 2=moderate, 3=severe';
COMMENT ON COLUMN migraine_entries.nausea IS 'Nausea present: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.vomit IS 'Vomiting present: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.phonophobia IS 'Sensitivity to noise: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.photophobia IS 'Sensitivity to light: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.visual IS 'Count of reversible visual symptoms (0-4)';
COMMENT ON COLUMN migraine_entries.sensory IS 'Count of reversible sensory symptoms (0-2)';
COMMENT ON COLUMN migraine_entries.dysphasia IS 'Impaired speech coordination: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.dysarthria IS 'Disarticulated speech: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.vertigo IS 'Dizziness: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.tinnitus IS 'Ringing in ears: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.hypoacusis IS 'Deafness: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.diplopia IS 'Double vision: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.defect IS 'Simultaneous visual field defect: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.ataxia IS 'Lack of muscular control: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.conscience IS 'Compromised awareness: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.paresthesia IS 'Bilateral paraesthesia: 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.dpf IS 'Family history (DPF): 0=no, 1=yes';
COMMENT ON COLUMN migraine_entries.migraine_type IS 'Type of migraine diagnosed';

