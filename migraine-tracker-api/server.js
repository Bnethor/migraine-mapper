import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import 'dotenv/config';
import { query, closePool } from './db/database.js';
import { parseWearableCSV, detectSource } from './utils/csvParser.js';
import { processSummaryIndicators } from './utils/summaryProcessor.js';
import { analyzeMigraineCorrelations } from './utils/migraineCorrelationAnalyzer.js';
import { buildRiskAnalysisPrompt, buildDataSummary } from './utils/promptBuilder.js';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Database field list for SELECT queries
const MIGRAINE_FIELDS = `
  id, user_id, start_time, end_time, intensity, location,
  triggers, symptoms, medication, notes,
  duration, frequency, pain_location, pain_character, pain_intensity,
  nausea, vomit, phonophobia, photophobia, visual, sensory,
  dysphasia, dysarthria, vertigo, tinnitus, hypoacusis, diplopia,
  defect, ataxia, conscience, paresthesia, dpf, migraine_type,
  created_at, updated_at
`;

// Transform database entry to API format
const transformEntryForAPI = (dbEntry) => {
  if (!dbEntry) return null;
  
  const startTime = new Date(dbEntry.start_time);
  const endTime = dbEntry.end_time ? new Date(dbEntry.end_time) : null;
  
  return {
    id: dbEntry.id,
    userId: dbEntry.user_id,
    date: startTime.toISOString().split('T')[0], // YYYY-MM-DD
    startTime: startTime.toISOString().split('T')[1].substring(0, 5), // HH:MM
    endTime: endTime ? endTime.toISOString().split('T')[1].substring(0, 5) : undefined,
    intensity: dbEntry.intensity,
    location: dbEntry.location || undefined,
    triggers: dbEntry.triggers ? dbEntry.triggers.split(',').map(t => t.trim()).filter(Boolean) : [],
    symptoms: dbEntry.symptoms ? dbEntry.symptoms.split(',').map(s => s.trim()).filter(Boolean) : [],
    medication: dbEntry.medication || undefined,
    notes: dbEntry.notes || undefined,
    // Clinical assessment fields
    duration: dbEntry.duration !== null ? dbEntry.duration : undefined,
    frequency: dbEntry.frequency !== null ? dbEntry.frequency : undefined,
    painLocation: dbEntry.pain_location !== null ? dbEntry.pain_location : undefined,
    painCharacter: dbEntry.pain_character !== null ? dbEntry.pain_character : undefined,
    painIntensity: dbEntry.pain_intensity !== null ? dbEntry.pain_intensity : undefined,
    nausea: dbEntry.nausea !== null ? dbEntry.nausea : undefined,
    vomit: dbEntry.vomit !== null ? dbEntry.vomit : undefined,
    phonophobia: dbEntry.phonophobia !== null ? dbEntry.phonophobia : undefined,
    photophobia: dbEntry.photophobia !== null ? dbEntry.photophobia : undefined,
    visual: dbEntry.visual !== null ? dbEntry.visual : undefined,
    sensory: dbEntry.sensory !== null ? dbEntry.sensory : undefined,
    dysphasia: dbEntry.dysphasia !== null ? dbEntry.dysphasia : undefined,
    dysarthria: dbEntry.dysarthria !== null ? dbEntry.dysarthria : undefined,
    vertigo: dbEntry.vertigo !== null ? dbEntry.vertigo : undefined,
    tinnitus: dbEntry.tinnitus !== null ? dbEntry.tinnitus : undefined,
    hypoacusis: dbEntry.hypoacusis !== null ? dbEntry.hypoacusis : undefined,
    diplopia: dbEntry.diplopia !== null ? dbEntry.diplopia : undefined,
    defect: dbEntry.defect !== null ? dbEntry.defect : undefined,
    ataxia: dbEntry.ataxia !== null ? dbEntry.ataxia : undefined,
    conscience: dbEntry.conscience !== null ? dbEntry.conscience : undefined,
    paresthesia: dbEntry.paresthesia !== null ? dbEntry.paresthesia : undefined,
    dpf: dbEntry.dpf !== null ? dbEntry.dpf : undefined,
    migraineType: dbEntry.migraine_type || undefined,
    createdAt: new Date(dbEntry.created_at).toISOString(),
    updatedAt: new Date(dbEntry.updated_at).toISOString()
  };
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  req.userId = decoded.userId;
  next();
};

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create new user
    // Note: In production, use bcrypt to hash passwords
    const result = await query(
      `INSERT INTO users (email, name, password)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email, name || email.split('@')[0], password]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at
        },
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const result = await query(
      'SELECT id, email, name, password, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Check password (in production, use bcrypt.compare)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

// Logout user (client-side only, token invalidation would require a blacklist)
app.post('/api/auth/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// ============================================
// USER PROFILE ROUTES
// ============================================

// Get user profile
app.get('/api/profile', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT user_id, typical_duration, monthly_frequency,
              typical_pain_location, typical_pain_character, typical_pain_intensity,
              experiences_nausea, experiences_vomit, experiences_phonophobia, experiences_photophobia,
              typical_visual_symptoms, typical_sensory_symptoms,
              experiences_dysphasia, experiences_dysarthria, experiences_vertigo,
              experiences_tinnitus, experiences_hypoacusis, experiences_diplopia,
              experiences_defect, experiences_ataxia, experiences_conscience, experiences_paresthesia,
              family_history, diagnosed_type, created_at, updated_at
       FROM user_profiles
       WHERE user_id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      // No profile yet, return empty profile
      return res.json({
        success: true,
        data: {
          userId: req.userId
        }
      });
    }

    const profile = result.rows[0];

    res.json({
      success: true,
      data: {
        userId: profile.user_id,
        typicalDuration: profile.typical_duration,
        monthlyFrequency: profile.monthly_frequency,
        typicalPainLocation: profile.typical_pain_location,
        typicalPainCharacter: profile.typical_pain_character,
        typicalPainIntensity: profile.typical_pain_intensity,
        experiencesNausea: profile.experiences_nausea,
        experiencesVomit: profile.experiences_vomit,
        experiencesPhonophobia: profile.experiences_phonophobia,
        experiencesPhotophobia: profile.experiences_photophobia,
        typicalVisualSymptoms: profile.typical_visual_symptoms,
        typicalSensorySymptoms: profile.typical_sensory_symptoms,
        experiencesDysphasia: profile.experiences_dysphasia,
        experiencesDysarthria: profile.experiences_dysarthria,
        experiencesVertigo: profile.experiences_vertigo,
        experiencesTinnitus: profile.experiences_tinnitus,
        experiencesHypoacusis: profile.experiences_hypoacusis,
        experiencesDiplopia: profile.experiences_diplopia,
        experiencesDefect: profile.experiences_defect,
        experiencesAtaxia: profile.experiences_ataxia,
        experiencesConscience: profile.experiences_conscience,
        experiencesParesthesia: profile.experiences_paresthesia,
        familyHistory: profile.family_history,
        diagnosedType: profile.diagnosed_type,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// Create or update user profile
app.post('/api/profile', authenticate, async (req, res) => {
  try {
    const {
      typicalDuration,
      monthlyFrequency,
      typicalPainLocation,
      typicalPainCharacter,
      typicalPainIntensity,
      experiencesNausea,
      experiencesVomit,
      experiencesPhonophobia,
      experiencesPhotophobia,
      typicalVisualSymptoms,
      typicalSensorySymptoms,
      experiencesDysphasia,
      experiencesDysarthria,
      experiencesVertigo,
      experiencesTinnitus,
      experiencesHypoacusis,
      experiencesDiplopia,
      experiencesDefect,
      experiencesAtaxia,
      experiencesConscience,
      experiencesParesthesia,
      familyHistory,
      diagnosedType
    } = req.body;

    // Upsert profile
    const result = await query(
      `INSERT INTO user_profiles (
         user_id, typical_duration, monthly_frequency,
         typical_pain_location, typical_pain_character, typical_pain_intensity,
         experiences_nausea, experiences_vomit, experiences_phonophobia, experiences_photophobia,
         typical_visual_symptoms, typical_sensory_symptoms,
         experiences_dysphasia, experiences_dysarthria, experiences_vertigo,
         experiences_tinnitus, experiences_hypoacusis, experiences_diplopia,
         experiences_defect, experiences_ataxia, experiences_conscience, experiences_paresthesia,
         family_history, diagnosed_type
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
       ON CONFLICT (user_id) DO UPDATE SET
         typical_duration = EXCLUDED.typical_duration,
         monthly_frequency = EXCLUDED.monthly_frequency,
         typical_pain_location = EXCLUDED.typical_pain_location,
         typical_pain_character = EXCLUDED.typical_pain_character,
         typical_pain_intensity = EXCLUDED.typical_pain_intensity,
         experiences_nausea = EXCLUDED.experiences_nausea,
         experiences_vomit = EXCLUDED.experiences_vomit,
         experiences_phonophobia = EXCLUDED.experiences_phonophobia,
         experiences_photophobia = EXCLUDED.experiences_photophobia,
         typical_visual_symptoms = EXCLUDED.typical_visual_symptoms,
         typical_sensory_symptoms = EXCLUDED.typical_sensory_symptoms,
         experiences_dysphasia = EXCLUDED.experiences_dysphasia,
         experiences_dysarthria = EXCLUDED.experiences_dysarthria,
         experiences_vertigo = EXCLUDED.experiences_vertigo,
         experiences_tinnitus = EXCLUDED.experiences_tinnitus,
         experiences_hypoacusis = EXCLUDED.experiences_hypoacusis,
         experiences_diplopia = EXCLUDED.experiences_diplopia,
         experiences_defect = EXCLUDED.experiences_defect,
         experiences_ataxia = EXCLUDED.experiences_ataxia,
         experiences_conscience = EXCLUDED.experiences_conscience,
         experiences_paresthesia = EXCLUDED.experiences_paresthesia,
         family_history = EXCLUDED.family_history,
         diagnosed_type = EXCLUDED.diagnosed_type,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        req.userId,
        typicalDuration !== undefined ? typicalDuration : null,
        monthlyFrequency !== undefined ? monthlyFrequency : null,
        typicalPainLocation !== undefined ? typicalPainLocation : null,
        typicalPainCharacter !== undefined ? typicalPainCharacter : null,
        typicalPainIntensity !== undefined ? typicalPainIntensity : null,
        experiencesNausea !== undefined ? experiencesNausea : null,
        experiencesVomit !== undefined ? experiencesVomit : null,
        experiencesPhonophobia !== undefined ? experiencesPhonophobia : null,
        experiencesPhotophobia !== undefined ? experiencesPhotophobia : null,
        typicalVisualSymptoms !== undefined ? typicalVisualSymptoms : null,
        typicalSensorySymptoms !== undefined ? typicalSensorySymptoms : null,
        experiencesDysphasia !== undefined ? experiencesDysphasia : null,
        experiencesDysarthria !== undefined ? experiencesDysarthria : null,
        experiencesVertigo !== undefined ? experiencesVertigo : null,
        experiencesTinnitus !== undefined ? experiencesTinnitus : null,
        experiencesHypoacusis !== undefined ? experiencesHypoacusis : null,
        experiencesDiplopia !== undefined ? experiencesDiplopia : null,
        experiencesDefect !== undefined ? experiencesDefect : null,
        experiencesAtaxia !== undefined ? experiencesAtaxia : null,
        experiencesConscience !== undefined ? experiencesConscience : null,
        experiencesParesthesia !== undefined ? experiencesParesthesia : null,
        familyHistory !== undefined ? familyHistory : null,
        diagnosedType || null
      ]
    );

    const profile = result.rows[0];

    res.json({
      success: true,
      data: {
        userId: profile.user_id,
        typicalDuration: profile.typical_duration,
        monthlyFrequency: profile.monthly_frequency,
        typicalPainLocation: profile.typical_pain_location,
        typicalPainCharacter: profile.typical_pain_character,
        typicalPainIntensity: profile.typical_pain_intensity,
        experiencesNausea: profile.experiences_nausea,
        experiencesVomit: profile.experiences_vomit,
        experiencesPhonophobia: profile.experiences_phonophobia,
        experiencesPhotophobia: profile.experiences_photophobia,
        typicalVisualSymptoms: profile.typical_visual_symptoms,
        typicalSensorySymptoms: profile.typical_sensory_symptoms,
        experiencesDysphasia: profile.experiences_dysphasia,
        experiencesDysarthria: profile.experiences_dysarthria,
        experiencesVertigo: profile.experiences_vertigo,
        experiencesTinnitus: profile.experiences_tinnitus,
        experiencesHypoacusis: profile.experiences_hypoacusis,
        experiencesDiplopia: profile.experiences_diplopia,
        experiencesDefect: profile.experiences_defect,
        experiencesAtaxia: profile.experiences_ataxia,
        experiencesConscience: profile.experiences_conscience,
        experiencesParesthesia: profile.experiences_paresthesia,
        familyHistory: profile.family_history,
        diagnosedType: profile.diagnosed_type,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// ============================================
// MIGRAINE ROUTES
// ============================================

// Get dashboard statistics
app.get('/api/migraine/statistics', authenticate, async (req, res) => {
  try {
    // Get migraine entries statistics
    const migraineStatsResult = await query(
      `SELECT 
         COUNT(*) as migraine_entries,
         COALESCE(AVG(intensity), 0) as average_intensity
       FROM migraine_entries
       WHERE user_id = $1`,
      [req.userId]
    );

    const { migraine_entries, average_intensity } = migraineStatsResult.rows[0];

    // Get count of unique days with wearable data
    const wearableStatsResult = await query(
      `SELECT COUNT(DISTINCT DATE(timestamp)) as wearable_days
       FROM wearable_data
       WHERE user_id = $1`,
      [req.userId]
    );

    const { wearable_days } = wearableStatsResult.rows[0];
    
    // Total entries = migraine logs + days with wearable data
    const totalEntries = parseInt(migraine_entries) + parseInt(wearable_days || 0);

    // Get top trigger based on correlation strength from migraine_correlations table
    const correlationResult = await query(
      `SELECT pattern_name, pattern_type, correlation_strength, confidence_score
       FROM migraine_correlations
       WHERE user_id = $1
       ORDER BY ABS(correlation_strength) * confidence_score DESC
       LIMIT 1`,
      [req.userId]
    );

    console.log(`[Dashboard Stats] User ${req.userId} - Found ${correlationResult.rows.length} correlation patterns`);
    if (correlationResult.rows.length > 0) {
      console.log(`[Dashboard Stats] Top pattern:`, correlationResult.rows[0]);
    }

    let topTrigger = { trigger: 'None', count: 0, correlationStrength: null };
    if (correlationResult.rows.length > 0) {
      const pattern = correlationResult.rows[0];
      topTrigger = {
        trigger: pattern.pattern_name,
        count: 0, // Not frequency-based anymore
        correlationStrength: parseFloat(pattern.correlation_strength),
        confidenceScore: parseFloat(pattern.confidence_score)
      };
      console.log(`[Dashboard Stats] Top trigger set to:`, topTrigger);
    } else {
      console.log(`[Dashboard Stats] No correlation patterns found, falling back to frequency-based triggers`);
      // Fallback to traditional frequency-based triggers if no correlations found
    const triggersResult = await query(
      `SELECT triggers
       FROM migraine_entries
       WHERE user_id = $1 AND triggers IS NOT NULL AND triggers != ''`,
      [req.userId]
    );

    const triggerCounts = {};
    triggersResult.rows.forEach(row => {
      if (row.triggers) {
        row.triggers.split(',').forEach(trigger => {
          const trimmed = trigger.trim();
          if (trimmed) {
            triggerCounts[trimmed] = (triggerCounts[trimmed] || 0) + 1;
          }
        });
      }
    });

      const topTriggersByFreq = Object.entries(triggerCounts)
      .map(([trigger, count]) => ({ trigger, count }))
        .sort((a, b) => b.count - a.count);
      
      if (topTriggersByFreq.length > 0) {
        topTrigger = topTriggersByFreq[0];
      }
    }

    // Get monthly frequency (last 6 months) including both migraine entries and marked migraine days
    const monthlyMigraineResult = await query(
      `SELECT 
         TO_CHAR(start_time, 'Mon YYYY') as month,
         COUNT(*) as count
       FROM migraine_entries
       WHERE user_id = $1
         AND start_time >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(start_time, 'YYYY-MM'), TO_CHAR(start_time, 'Mon YYYY')`,
      [req.userId]
    );

    // Get marked migraine days from calendar
    const monthlyMarkedDaysResult = await query(
      `SELECT 
         TO_CHAR(date, 'Mon YYYY') as month,
         COUNT(*) as count
       FROM migraine_day_markers
       WHERE user_id = $1
         AND is_migraine_day = true
         AND date >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY TO_CHAR(date, 'YYYY-MM'), TO_CHAR(date, 'Mon YYYY')`,
      [req.userId]
    );

    // Combine and deduplicate monthly counts
    const monthMap = new Map();
    
    monthlyMigraineResult.rows.forEach(row => {
      monthMap.set(row.month, parseInt(row.count));
    });
    
    // Add marked days (these might overlap with entries, but calendar marks are primary)
    monthlyMarkedDaysResult.rows.forEach(row => {
      const existing = monthMap.get(row.month) || 0;
      // Take the max to avoid double counting
      monthMap.set(row.month, Math.max(existing, parseInt(row.count)));
    });

    // Fill in missing months with zero counts
    const monthlyFrequency = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyFrequency.push({
        month: monthStr,
        count: monthMap.get(monthStr) || 0
      });
    }

    res.json({
      success: true,
      data: {
        totalEntries: totalEntries,
        migraineEntries: parseInt(migraine_entries),
        wearableDays: parseInt(wearable_days || 0),
        averageIntensity: Math.round(parseFloat(average_intensity) * 10) / 10,
        mostCommonTriggers: [topTrigger],
        topTrigger: topTrigger,
        frequencyByMonth: monthlyFrequency,
        intensityTrend: [] // Not implemented yet but expected by frontend
      }
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

// Get recent entries
app.get('/api/migraine/recent', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const result = await query(
      `SELECT ${MIGRAINE_FIELDS}
       FROM migraine_entries
       WHERE user_id = $1
       ORDER BY start_time DESC
       LIMIT $2`,
      [req.userId, limit]
    );

    const entries = result.rows.map(row => transformEntryForAPI(row));

    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    console.error('Recent entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent entries'
    });
  }
});

// Get all migraine entries (with pagination and search)
app.get('/api/migraine', authenticate, async (req, res) => {
  try {
    const { page = '1', limit = '10', search = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let queryText = `
      SELECT ${MIGRAINE_FIELDS}
      FROM migraine_entries
      WHERE user_id = $1
    `;
    const queryParams = [req.userId];

    // Add search filter if provided
    if (search) {
      queryText += ` AND (
        LOWER(triggers) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(symptoms) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(location) LIKE LOWER($${queryParams.length + 1})
      )`;
      queryParams.push(`%${search}%`);
    }

    // Get total count
    const countResult = await query(
      queryText.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) FROM'),
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    queryText += ` ORDER BY start_time DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limitNum, offset);

    const result = await query(queryText, queryParams);

    const entries = result.rows.map(row => transformEntryForAPI(row));

    res.json({
      success: true,
      data: {
        entries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching entries'
    });
  }
});

// Get single migraine entry
app.get('/api/migraine/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT ${MIGRAINE_FIELDS}
       FROM migraine_entries
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Migraine entry not found'
      });
    }

    const entry = result.rows[0];

    // Check if entry belongs to user
    if (entry.user_id !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: transformEntryForAPI(entry)
    });
  } catch (error) {
    console.error('Get entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching entry'
    });
  }
});

// Create new migraine entry
app.post('/api/migraine', authenticate, async (req, res) => {
  try {
    const {
      date,
      startTime,
      endTime,
      intensity,
      location,
      triggers,
      symptoms,
      medication,
      notes,
      // Clinical assessment fields
      duration,
      frequency,
      painLocation,
      painCharacter,
      painIntensity,
      nausea,
      vomit,
      phonophobia,
      photophobia,
      visual,
      sensory,
      dysphasia,
      dysarthria,
      vertigo,
      tinnitus,
      hypoacusis,
      diplopia,
      defect,
      ataxia,
      conscience,
      paresthesia,
      dpf,
      migraineType
    } = req.body;

    // Validation
    if (!date || !startTime || !intensity) {
      return res.status(400).json({
        success: false,
        message: 'Date, start time, and intensity are required'
      });
    }

    // Combine date and time into ISO timestamp
    const startDateTime = `${date}T${startTime}:00`;
    const endDateTime = endTime ? `${date}T${endTime}:00` : null;

    // Convert arrays to comma-separated strings
    const triggersStr = Array.isArray(triggers) ? triggers.join(', ') : (triggers || '');
    const symptomsStr = Array.isArray(symptoms) ? symptoms.join(', ') : (symptoms || '');

    const result = await query(
      `INSERT INTO migraine_entries 
       (user_id, start_time, end_time, intensity, location, triggers, symptoms, medication, notes,
        duration, frequency, pain_location, pain_character, pain_intensity,
        nausea, vomit, phonophobia, photophobia, visual, sensory,
        dysphasia, dysarthria, vertigo, tinnitus, hypoacusis, diplopia,
        defect, ataxia, conscience, paresthesia, dpf, migraine_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
       RETURNING ${MIGRAINE_FIELDS}`,
      [
        req.userId,
        startDateTime,
        endDateTime,
        parseInt(intensity),
        location || '',
        triggersStr,
        symptomsStr,
        medication || '',
        notes || '',
        duration !== undefined ? duration : null,
        frequency !== undefined ? frequency : null,
        painLocation !== undefined ? painLocation : null,
        painCharacter !== undefined ? painCharacter : null,
        painIntensity !== undefined ? painIntensity : null,
        nausea !== undefined ? nausea : null,
        vomit !== undefined ? vomit : null,
        phonophobia !== undefined ? phonophobia : null,
        photophobia !== undefined ? photophobia : null,
        visual !== undefined ? visual : null,
        sensory !== undefined ? sensory : null,
        dysphasia !== undefined ? dysphasia : null,
        dysarthria !== undefined ? dysarthria : null,
        vertigo !== undefined ? vertigo : null,
        tinnitus !== undefined ? tinnitus : null,
        hypoacusis !== undefined ? hypoacusis : null,
        diplopia !== undefined ? diplopia : null,
        defect !== undefined ? defect : null,
        ataxia !== undefined ? ataxia : null,
        conscience !== undefined ? conscience : null,
        paresthesia !== undefined ? paresthesia : null,
        dpf !== undefined ? dpf : null,
        migraineType || null
      ]
    );

    const entry = result.rows[0];

    res.status(201).json({
      success: true,
      data: transformEntryForAPI(entry)
    });
  } catch (error) {
    console.error('Create entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating entry'
    });
  }
});

// Update migraine entry
app.put('/api/migraine/:id', authenticate, async (req, res) => {
  try {
    // First, check if entry exists and belongs to user
    const checkResult = await query(
      'SELECT user_id FROM migraine_entries WHERE id = $1',
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Migraine entry not found'
      });
    }

    if (checkResult.rows[0].user_id !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      date,
      startTime,
      endTime,
      intensity,
      location,
      triggers,
      symptoms,
      medication,
      notes,
      // Clinical fields
      duration,
      frequency,
      painLocation,
      painCharacter,
      painIntensity,
      nausea,
      vomit,
      phonophobia,
      photophobia,
      visual,
      sensory,
      dysphasia,
      dysarthria,
      vertigo,
      tinnitus,
      hypoacusis,
      diplopia,
      defect,
      ataxia,
      conscience,
      paresthesia,
      dpf,
      migraineType
    } = req.body;

    // Prepare update values
    let startDateTime = null;
    let endDateTime = null;
    
    if (date && startTime) {
      startDateTime = `${date}T${startTime}:00`;
    }
    if (date && endTime) {
      endDateTime = `${date}T${endTime}:00`;
    }

    // Convert arrays to comma-separated strings if provided
    const triggersStr = triggers ? (Array.isArray(triggers) ? triggers.join(', ') : triggers) : null;
    const symptomsStr = symptoms ? (Array.isArray(symptoms) ? symptoms.join(', ') : symptoms) : null;

    const result = await query(
      `UPDATE migraine_entries
       SET start_time = COALESCE($1, start_time),
           end_time = COALESCE($2, end_time),
           intensity = COALESCE($3, intensity),
           location = COALESCE($4, location),
           triggers = COALESCE($5, triggers),
           symptoms = COALESCE($6, symptoms),
           medication = COALESCE($7, medication),
           notes = COALESCE($8, notes),
           duration = COALESCE($9, duration),
           frequency = COALESCE($10, frequency),
           pain_location = COALESCE($11, pain_location),
           pain_character = COALESCE($12, pain_character),
           pain_intensity = COALESCE($13, pain_intensity),
           nausea = COALESCE($14, nausea),
           vomit = COALESCE($15, vomit),
           phonophobia = COALESCE($16, phonophobia),
           photophobia = COALESCE($17, photophobia),
           visual = COALESCE($18, visual),
           sensory = COALESCE($19, sensory),
           dysphasia = COALESCE($20, dysphasia),
           dysarthria = COALESCE($21, dysarthria),
           vertigo = COALESCE($22, vertigo),
           tinnitus = COALESCE($23, tinnitus),
           hypoacusis = COALESCE($24, hypoacusis),
           diplopia = COALESCE($25, diplopia),
           defect = COALESCE($26, defect),
           ataxia = COALESCE($27, ataxia),
           conscience = COALESCE($28, conscience),
           paresthesia = COALESCE($29, paresthesia),
           dpf = COALESCE($30, dpf),
           migraine_type = COALESCE($31, migraine_type)
       WHERE id = $32
       RETURNING ${MIGRAINE_FIELDS}`,
      [
        startDateTime,
        endDateTime,
        intensity ? parseInt(intensity) : null,
        location,
        triggersStr,
        symptomsStr,
        medication,
        notes,
        duration !== undefined ? duration : null,
        frequency !== undefined ? frequency : null,
        painLocation !== undefined ? painLocation : null,
        painCharacter !== undefined ? painCharacter : null,
        painIntensity !== undefined ? painIntensity : null,
        nausea !== undefined ? nausea : null,
        vomit !== undefined ? vomit : null,
        phonophobia !== undefined ? phonophobia : null,
        photophobia !== undefined ? photophobia : null,
        visual !== undefined ? visual : null,
        sensory !== undefined ? sensory : null,
        dysphasia !== undefined ? dysphasia : null,
        dysarthria !== undefined ? dysarthria : null,
        vertigo !== undefined ? vertigo : null,
        tinnitus !== undefined ? tinnitus : null,
        hypoacusis !== undefined ? hypoacusis : null,
        diplopia !== undefined ? diplopia : null,
        defect !== undefined ? defect : null,
        ataxia !== undefined ? ataxia : null,
        conscience !== undefined ? conscience : null,
        paresthesia !== undefined ? paresthesia : null,
        dpf !== undefined ? dpf : null,
        migraineType || null,
        req.params.id
      ]
    );

    const entry = result.rows[0];

    res.json({
      success: true,
      data: transformEntryForAPI(entry)
    });
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating entry'
    });
  }
});

// Delete migraine entry
app.delete('/api/migraine/:id', authenticate, async (req, res) => {
  try {
    // First, check if entry exists and belongs to user
    const checkResult = await query(
      'SELECT user_id FROM migraine_entries WHERE id = $1',
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Migraine entry not found'
      });
    }

    if (checkResult.rows[0].user_id !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await query('DELETE FROM migraine_entries WHERE id = $1', [req.params.id]);

    res.json({
      success: true,
      message: 'Entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting entry'
    });
  }
});

// ============================================
// WEARABLE DATA ROUTES
// ============================================

// Upload CSV file with wearable data
app.post('/api/wearable/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a CSV file.'
      });
    }

    // Parse CSV file
    let parsedData;
    try {
      parsedData = await parseWearableCSV(req.file.buffer);
      console.log(`📊 CSV parsed: ${parsedData.data.length} rows`);
      
      // Log sample of timestamps to verify hourly data
      if (parsedData.data.length > 0) {
        console.log('Sample timestamps:', parsedData.data.slice(0, 5).map(r => r.timestamp?.toISOString()).filter(Boolean));
      }
    } catch (error) {
      console.error('CSV parsing error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to parse CSV file. Please check the file format.',
        error: error.message
      });
    }

    if (!parsedData.data || parsedData.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data found in CSV file. Please check that the file contains timestamp and metric data.'
      });
    }

    // Detect source device
    const source = detectSource(
      Object.keys(parsedData.fieldMapping),
      req.file.originalname
    );

    // Create upload session
    const sessionResult = await query(
      `INSERT INTO upload_sessions 
       (user_id, filename, file_size, source, total_rows, field_mapping, unrecognized_fields, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing')
       RETURNING id`,
      [
        req.userId,
        req.file.originalname,
        req.file.size,
        source,
        parsedData.data.length,
        JSON.stringify(parsedData.fieldMapping),
        parsedData.unrecognizedFields.length > 0 ? parsedData.unrecognizedFields : null
      ]
    );
    const uploadSessionId = sessionResult.rows[0].id;

    // Process data with duplicate detection
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    // Track earliest date in the uploaded data
    let earliestDate = null;
    for (const row of parsedData.data) {
      if (row.timestamp) {
        const currentTimestamp = new Date(row.timestamp);
        if (!earliestDate || currentTimestamp < earliestDate) {
          earliestDate = currentTimestamp;
        }
      }
    }

    for (const row of parsedData.data) {
      try {
        // Check if record already exists (same user, same timestamp)
        const existing = await query(
          `SELECT id, upload_session_id FROM wearable_data 
           WHERE user_id = $1 AND timestamp = $2`,
          [req.userId, row.timestamp]
        );

        if (existing.rows.length > 0) {
          const existingRecord = existing.rows[0];
          
          // If it's from the same upload session, skip (duplicate in same file)
          if (existingRecord.upload_session_id === uploadSessionId) {
            skippedCount++;
            continue;
          }
          
          // If it's from a different upload, update it
          const result = await query(
            `UPDATE wearable_data SET
              stress_value = COALESCE($1, stress_value),
              recovery_value = COALESCE($2, recovery_value),
              heart_rate = COALESCE($3, heart_rate),
              hrv = COALESCE($4, hrv),
              sleep_efficiency = COALESCE($5, sleep_efficiency),
              sleep_heart_rate = COALESCE($6, sleep_heart_rate),
              skin_temperature = COALESCE($7, skin_temperature),
              restless_periods = COALESCE($8, restless_periods),
              additional_data = COALESCE($9, additional_data),
              source = COALESCE($10, source),
              upload_session_id = $11,
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $12 AND timestamp = $13
            RETURNING id`,
            [
              row.stress_value,
              row.recovery_value,
              row.heart_rate,
              row.hrv,
              row.sleep_efficiency,
              row.sleep_heart_rate,
              row.skin_temperature,
              row.restless_periods,
              Object.keys(row.additional_data).length > 0 ? JSON.stringify(row.additional_data) : null,
              source,
              uploadSessionId,
              req.userId,
              row.timestamp
            ]
          );
          updatedCount++;
        } else {
          // Insert new record with upload session reference
          try {
            const result = await query(
              `INSERT INTO wearable_data 
               (user_id, timestamp, stress_value, recovery_value, heart_rate, hrv,
                sleep_efficiency, sleep_heart_rate, skin_temperature, restless_periods,
                additional_data, source, upload_session_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
               RETURNING id`,
              [
                req.userId,
                row.timestamp,
                row.stress_value,
                row.recovery_value,
                row.heart_rate,
                row.hrv,
                row.sleep_efficiency,
                row.sleep_heart_rate,
                row.skin_temperature,
                row.restless_periods,
                Object.keys(row.additional_data).length > 0 ? JSON.stringify(row.additional_data) : null,
                source,
                uploadSessionId
              ]
            );
            insertedCount++;
          } catch (insertError) {
            // Handle unique constraint violation (duplicate timestamp)
            if (insertError.code === '23505') {
              skippedCount++;
            } else {
              throw insertError;
            }
          }
        }
      } catch (error) {
        console.error('Error processing row:', error);
        errors.push({
          timestamp: row.timestamp,
          error: error.message
        });
      }
    }

    // Update upload session with final statistics
    const status = errors.length === parsedData.data.length ? 'failed' : 
                   errors.length > 0 ? 'partial' : 'completed';
    
    await query(
      `UPDATE upload_sessions SET
        inserted_rows = $1,
        updated_rows = $2,
        skipped_rows = $3,
        error_rows = $4,
        status = $5,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [insertedCount, updatedCount, skippedCount, errors.length, status, uploadSessionId]
    );

    console.log(`✅ Upload complete: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped, ${errors.length} errors (total: ${parsedData.data.length})`);

    res.status(201).json({
      success: true,
      data: {
        uploadSessionId,
        inserted: insertedCount,
        updated: updatedCount,
        skipped: skippedCount,
        total: parsedData.data.length,
        errors: errors.length,
        source,
        fieldMapping: parsedData.fieldMapping,
        unrecognizedFields: parsedData.unrecognizedFields,
        errorDetails: errors.length > 0 ? errors : undefined,
        earliestDate: earliestDate ? earliestDate.toISOString() : null
      },
      message: `Successfully processed ${insertedCount + updatedCount} of ${parsedData.data.length} rows (${insertedCount} new, ${updatedCount} updated, ${skippedCount} skipped)`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing CSV file',
      error: error.message
    });
  }
});

// Get wearable data for user
app.get('/api/wearable', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, limit = '1000' } = req.query;
    
    let queryText = `
      SELECT id, timestamp, stress_value, recovery_value, heart_rate, hrv,
             sleep_efficiency, sleep_heart_rate, skin_temperature, restless_periods,
             additional_data, source, created_at
      FROM wearable_data
      WHERE user_id = $1
    `;
    const queryParams = [req.userId];

    if (startDate) {
      queryText += ` AND timestamp >= $${queryParams.length + 1}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      queryText += ` AND timestamp <= $${queryParams.length + 1}`;
      queryParams.push(endDate);
    }

    queryText += ` ORDER BY timestamp DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(parseInt(limit));

    const result = await query(queryText, queryParams);

    const data = result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp.toISOString(),
      stressValue: row.stress_value,
      recoveryValue: row.recovery_value,
      heartRate: row.heart_rate,
      hrv: row.hrv,
      sleepEfficiency: row.sleep_efficiency,
      sleepHeartRate: row.sleep_heart_rate,
      skinTemperature: row.skin_temperature,
      restlessPeriods: row.restless_periods,
      additionalData: row.additional_data,
      source: row.source,
      createdAt: row.created_at.toISOString()
    }));

    res.json({
      success: true,
      data: {
        entries: data,
        count: data.length
      }
    });
  } catch (error) {
    console.error('Get wearable data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wearable data'
    });
  }
});

// Get upload sessions (list of all uploads)
app.get('/api/wearable/uploads', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, filename, file_size, source, total_rows, inserted_rows, updated_rows, 
              skipped_rows, error_rows, status, created_at, updated_at
       FROM upload_sessions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.userId]
    );

    const uploads = result.rows.map(row => ({
      id: row.id,
      filename: row.filename,
      fileSize: parseInt(row.file_size),
      source: row.source,
      totalRows: parseInt(row.total_rows),
      insertedRows: parseInt(row.inserted_rows),
      updatedRows: parseInt(row.updated_rows),
      skippedRows: parseInt(row.skipped_rows),
      errorRows: parseInt(row.error_rows),
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    }));

    res.json({
      success: true,
      data: {
        uploads,
        count: uploads.length
      }
    });
  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upload sessions'
    });
  }
});

// Get single upload session details
app.get('/api/wearable/uploads/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, filename, file_size, source, total_rows, inserted_rows, updated_rows,
              skipped_rows, error_rows, field_mapping, unrecognized_fields, status,
              created_at, updated_at
       FROM upload_sessions
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Upload session not found'
      });
    }

    const upload = result.rows[0];

    res.json({
      success: true,
      data: {
        id: upload.id,
        filename: upload.filename,
        fileSize: parseInt(upload.file_size),
        source: upload.source,
        totalRows: parseInt(upload.total_rows),
        insertedRows: parseInt(upload.inserted_rows),
        updatedRows: parseInt(upload.updated_rows),
        skippedRows: parseInt(upload.skipped_rows),
        errorRows: parseInt(upload.error_rows),
        fieldMapping: upload.field_mapping,
        unrecognizedFields: upload.unrecognized_fields || [],
        status: upload.status,
        createdAt: upload.created_at.toISOString(),
        updatedAt: upload.updated_at.toISOString()
      }
    });
  } catch (error) {
    console.error('Get upload session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upload session'
    });
  }
});

// Delete upload session and associated data
app.delete('/api/wearable/uploads/:id', authenticate, async (req, res) => {
  try {
    // First verify the upload session belongs to the user
    const checkResult = await query(
      'SELECT id FROM upload_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Upload session not found'
      });
    }

    // Count records that will be deleted
    const countResult = await query(
      'SELECT COUNT(*) as count FROM wearable_data WHERE upload_session_id = $1',
      [req.params.id]
    );
    const recordCount = parseInt(countResult.rows[0].count);

    // Delete the upload session (cascade will delete associated wearable_data)
    await query('DELETE FROM upload_sessions WHERE id = $1', [req.params.id]);

    res.json({
      success: true,
      message: `Upload session and ${recordCount} associated data records deleted successfully`,
      data: {
        deletedRecords: recordCount
      }
    });
  } catch (error) {
    console.error('Delete upload session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting upload session'
    });
  }
});

// Delete all uploads for user (cleanup)
app.delete('/api/wearable/uploads', authenticate, async (req, res) => {
  try {
    // Get count before deletion
    const countResult = await query(
      'SELECT COUNT(*) as count FROM upload_sessions WHERE user_id = $1',
      [req.userId]
    );
    const uploadCount = parseInt(countResult.rows[0].count);

    // Delete all upload sessions for user (cascade will delete associated wearable_data)
    await query(
      'DELETE FROM upload_sessions WHERE user_id = $1',
      [req.userId]
    );

    res.json({
      success: true,
      message: `Deleted ${uploadCount} upload session(s) and associated data`,
      data: {
        deletedCount: uploadCount
      }
    });
  } catch (error) {
    console.error('Delete all uploads error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting upload sessions'
    });
  }
});

// Cleanup orphaned wearable data (data without upload_session_id)
app.post('/api/wearable/cleanup-orphaned', authenticate, async (req, res) => {
  try {
    // Count orphaned records
    const countResult = await query(
      `SELECT COUNT(*) as count 
       FROM wearable_data 
       WHERE user_id = $1 AND upload_session_id IS NULL`,
      [req.userId]
    );
    const orphanedCount = parseInt(countResult.rows[0].count);

    if (orphanedCount === 0) {
      return res.json({
        success: true,
        message: 'No orphaned data found',
        data: {
          deletedCount: 0
        }
      });
    }

    // Delete orphaned records
    await query(
      `DELETE FROM wearable_data 
       WHERE user_id = $1 AND upload_session_id IS NULL`,
      [req.userId]
    );

    res.json({
      success: true,
      message: `Cleaned up ${orphanedCount} orphaned data record(s)`,
      data: {
        deletedCount: orphanedCount
      }
    });
  } catch (error) {
    console.error('Cleanup orphaned data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up orphaned data'
    });
  }
});

// ============================================
// CALENDAR & MIGRAINE DAY MARKERS ROUTES
// ============================================

// Sync all existing migraine entries to calendar
app.post('/api/calendar/sync-entries', authenticate, async (req, res) => {
  try {
    // Get all unique dates from migraine_entries for this user
    const entriesResult = await query(
      `SELECT DISTINCT DATE(start_time) as date, COUNT(*) as count
       FROM migraine_entries
       WHERE user_id = $1
       GROUP BY DATE(start_time)`,
      [req.userId]
    );

    let synced = 0;
    let errors = 0;

    for (const row of entriesResult.rows) {
      try {
        const dateStr = typeof row.date === 'string' 
          ? row.date 
          : row.date.toISOString().split('T')[0];
        
        await query(
          `INSERT INTO migraine_day_markers (user_id, date, is_migraine_day)
           VALUES ($1, $2::date, true)
           ON CONFLICT (user_id, date)
           DO UPDATE SET
             is_migraine_day = true,
             updated_at = CURRENT_TIMESTAMP`,
          [req.userId, dateStr]
        );
        synced++;
      } catch (error) {
        console.error('Error syncing entry:', error);
        errors++;
      }
    }

    console.log(`[Calendar Sync] User ${req.userId} - Synced ${synced} days, ${errors} errors`);

    res.json({
      success: true,
      data: {
        synced,
        errors,
        total: entriesResult.rows.length
      },
      message: `Successfully synced ${synced} migraine days to calendar`
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing calendar'
    });
  }
});

// Get calendar data (days with wearable data and migraine markers)
app.get('/api/calendar', authenticate, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Default to current month if not specified
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    
    // Calculate date range for the month
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    
    // Get days with wearable data
    const wearableDaysResult = await query(
      `SELECT DISTINCT DATE(timestamp) as date, COUNT(*) as data_points
       FROM wearable_data
       WHERE user_id = $1 
         AND timestamp >= $2 
         AND timestamp <= $3
       GROUP BY DATE(timestamp)
       ORDER BY DATE(timestamp)`,
      [req.userId, startDate, endDate]
    );
    
    // Get migraine day markers for the month
    // Build date strings using local date components to avoid timezone issues
    const startYear = startDate.getFullYear();
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const startDay = String(startDate.getDate()).padStart(2, '0');
    const startDateStr = `${startYear}-${startMonth}-${startDay}`;
    
    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    const endDateStr = `${endYear}-${endMonth}-${endDay}`;
    
    const migraineMarkersResult = await query(
      `SELECT date, is_migraine_day, severity, notes
       FROM migraine_day_markers
       WHERE user_id = $1 
         AND date >= $2 
         AND date <= $3
       ORDER BY date`,
      [req.userId, startDateStr, endDateStr]
    );
    
    // Get migraine entry counts per day for this month
    const migraineEntriesResult = await query(
      `SELECT DATE(start_time) as date, COUNT(*) as migraine_count
       FROM migraine_entries
       WHERE user_id = $1
         AND start_time >= $2
         AND start_time <= $3
       GROUP BY DATE(start_time)
       ORDER BY DATE(start_time)`,
      [req.userId, startDate, endDate]
    );
    
    const migraineEntryCounts = new Map();
    migraineEntriesResult.rows.forEach(row => {
      const dateStr = typeof row.date === 'string' 
        ? row.date 
        : row.date.toISOString().split('T')[0];
      migraineEntryCounts.set(dateStr, parseInt(row.migraine_count));
    });
    
    // Combine the data - PostgreSQL DATE type returns as string in YYYY-MM-DD format
    // But we need to handle it properly to avoid timezone issues
    const daysWithData = new Set(wearableDaysResult.rows.map(row => {
      // PostgreSQL DATE() function returns a DATE type which is already in YYYY-MM-DD format
      if (typeof row.date === 'string') {
        return row.date;
      }
      // If it's a Date object, extract local date components
      const year = row.date.getFullYear();
      const month = String(row.date.getMonth() + 1).padStart(2, '0');
      const day = String(row.date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }));
    
    const migraineMarkers = new Map();
    migraineMarkersResult.rows.forEach(row => {
      // PostgreSQL DATE type is already a string in YYYY-MM-DD format
      const dateKey = typeof row.date === 'string' ? row.date : 
        (() => {
          const year = row.date.getFullYear();
          const month = String(row.date.getMonth() + 1).padStart(2, '0');
          const day = String(row.date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })();
      migraineMarkers.set(dateKey, {
        isMigraineDay: row.is_migraine_day,
        severity: row.severity,
        notes: row.notes
      });
    });
    
    // Build calendar days using local date components to avoid timezone issues
    const calendarDays = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Get local date components to avoid timezone shift
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const marker = migraineMarkers.get(dateStr);
      
      // Find matching data point count
      const dataPointRow = wearableDaysResult.rows.find(r => {
        let rowDateStr;
        if (typeof r.date === 'string') {
          rowDateStr = r.date;
        } else {
          // Extract local date components to avoid timezone shift
          const year = r.date.getFullYear();
          const month = String(r.date.getMonth() + 1).padStart(2, '0');
          const day = String(r.date.getDate()).padStart(2, '0');
          rowDateStr = `${year}-${month}-${day}`;
        }
        return rowDateStr === dateStr;
      });
      
      const migraineCount = migraineEntryCounts.get(dateStr) || 0;
      
      calendarDays.push({
        date: dateStr,
        hasData: daysWithData.has(dateStr),
        dataPoints: dataPointRow ? parseInt(dataPointRow.data_points) : 0,
        isMigraineDay: marker?.isMigraineDay || migraineCount > 0, // Auto-mark if entries exist
        migraineCount: migraineCount,
        severity: marker?.severity || null,
        notes: marker?.notes || null
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Count total migraine days (from markers + entries)
    const uniqueMigraineDays = new Set();
    
    // Add manually marked days
    migraineMarkersResult.rows.forEach(row => {
      if (row.is_migraine_day) {
        const dateStr = typeof row.date === 'string' ? row.date : row.date.toISOString().split('T')[0];
        uniqueMigraineDays.add(dateStr);
      }
    });
    
    // Add days with migraine entries
    migraineEntryCounts.forEach((count, dateStr) => {
      if (count > 0) {
        uniqueMigraineDays.add(dateStr);
      }
    });

    // Count total days with data (wearable data + migraine entries)
    const allDaysWithData = new Set([...daysWithData]);
    migraineEntryCounts.forEach((count, dateStr) => {
      if (count > 0) {
        allDaysWithData.add(dateStr);
      }
    });
    
    res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth + 1,
        days: calendarDays,
        totalDaysWithData: allDaysWithData.size,
        totalMigraineDays: uniqueMigraineDays.size
      }
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar data'
    });
  }
});

// Mark/unmark migraine day
app.post('/api/calendar/migraine-day', authenticate, async (req, res) => {
  try {
    const { date, isMigraineDay, severity, notes } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }
    
    // Validate and parse date (handle YYYY-MM-DD format correctly)
    let dateOnly;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Already in YYYY-MM-DD format, use directly
      dateOnly = date;
    } else {
      // Parse as local date to avoid timezone issues
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
      // Get local date components to avoid timezone shift
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      dateOnly = `${year}-${month}-${day}`;
    }
    
    // Upsert migraine day marker
    const result = await query(
      `INSERT INTO migraine_day_markers (user_id, date, is_migraine_day, severity, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, date) 
       DO UPDATE SET
         is_migraine_day = EXCLUDED.is_migraine_day,
         severity = EXCLUDED.severity,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, date, is_migraine_day, severity, notes, created_at, updated_at`,
      [
        req.userId,
        dateOnly,
        isMigraineDay !== undefined ? isMigraineDay : true,
        severity !== undefined ? severity : null,
        notes || null
      ]
    );
    
    const marker = result.rows[0];
    
    // PostgreSQL DATE type is already in YYYY-MM-DD format as string
    const markerDate = typeof marker.date === 'string' 
      ? marker.date 
      : marker.date.toISOString().split('T')[0];
    
    res.json({
      success: true,
      data: {
        id: marker.id,
        date: markerDate,
        isMigraineDay: marker.is_migraine_day,
        severity: marker.severity,
        notes: marker.notes,
        createdAt: marker.created_at.toISOString(),
        updatedAt: marker.updated_at.toISOString()
      }
    });
  } catch (error) {
    console.error('Mark migraine day error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking migraine day'
    });
  }
});

// Remove migraine day marker
app.delete('/api/calendar/migraine-day/:date', authenticate, async (req, res) => {
  try {
    const dateStr = req.params.date;
    
    // Validate and parse date (handle YYYY-MM-DD format correctly)
    let dateOnly;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Already in YYYY-MM-DD format, use directly
      dateOnly = dateStr;
    } else {
      // Parse as local date to avoid timezone issues
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
      // Get local date components to avoid timezone shift
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      dateOnly = `${year}-${month}-${day}`;
    }
    
    await query(
      'DELETE FROM migraine_day_markers WHERE user_id = $1 AND date = $2',
      [req.userId, dateOnly]
    );
    
    res.json({
      success: true,
      message: 'Migraine day marker removed successfully'
    });
  } catch (error) {
    console.error('Remove migraine day error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing migraine day marker'
    });
  }
});

// Remove all migraine day markers for user
app.delete('/api/calendar/migraine-days/all', authenticate, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM migraine_day_markers WHERE user_id = $1 RETURNING id',
      [req.userId]
    );
    
    res.json({
      success: true,
      message: 'All migraine day markers removed successfully',
      data: {
        deletedCount: result.rowCount || 0
      }
    });
  } catch (error) {
    console.error('Remove all migraine days error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing all migraine day markers'
    });
  }
});

// ============================================
// SUMMARY INDICATORS ROUTES
// ============================================

// Process summary indicators (with caching)
app.post('/api/summary/process', authenticate, async (req, res) => {
  try {
    const { forceReprocess = false } = req.body;
    
    // Check if processing is needed (cache check)
    if (!forceReprocess) {
      const lastProcessed = await query(
        `SELECT MAX(processed_at) as last_processed
         FROM summary_indicators
         WHERE user_id = $1`,
        [req.userId]
      );
      
      if (lastProcessed.rows[0]?.last_processed) {
        const lastProcessedTime = new Date(lastProcessed.rows[0].last_processed);
        const now = new Date();
        const hoursSinceLastProcess = (now - lastProcessedTime) / (1000 * 60 * 60);
        
        // If processed within last 6 hours, skip (cache)
        if (hoursSinceLastProcess < 6) {
          return res.json({
            success: true,
            data: {
              cached: true,
              lastProcessed: lastProcessedTime.toISOString(),
              message: 'Summary indicators are up to date (cached)'
            }
          });
        }
      }
    }

    // Process summary indicators
    const result = await processSummaryIndicators(req.userId, forceReprocess);
    
    res.json({
      success: true,
      data: {
        cached: false,
        ...result,
        message: `Processed ${result.processed} days`
      }
    });
  } catch (error) {
    console.error('Process summary indicators error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing summary indicators',
      error: error.message
    });
  }
});

// Get migraine correlation patterns for risk prediction
app.get('/api/summary/correlations', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT pattern_type, pattern_name, pattern_definition,
              correlation_strength, confidence_score, threshold_value,
              avg_value_on_migraine_days, avg_value_on_normal_days,
              migraine_days_count, total_days_analyzed,
              last_updated_at
       FROM migraine_correlations
       WHERE user_id = $1
       ORDER BY confidence_score DESC, ABS(correlation_strength) DESC`,
      [req.userId]
    );

    const patterns = result.rows.map(row => ({
      patternType: row.pattern_type,
      patternName: row.pattern_name,
      patternDefinition: row.pattern_definition,
      correlationStrength: row.correlation_strength ? parseFloat(row.correlation_strength) : null,
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : null,
      thresholdValue: row.threshold_value ? parseFloat(row.threshold_value) : null,
      avgValueOnMigraineDays: row.avg_value_on_migraine_days ? parseFloat(row.avg_value_on_migraine_days) : null,
      avgValueOnNormalDays: row.avg_value_on_normal_days ? parseFloat(row.avg_value_on_normal_days) : null,
      migraineDaysCount: parseInt(row.migraine_days_count) || 0,
      totalDaysAnalyzed: parseInt(row.total_days_analyzed) || 0,
      lastUpdated: row.last_updated_at.toISOString()
    }));

    res.json({
      success: true,
      data: {
        patterns,
        count: patterns.length
      }
    });
  } catch (error) {
    console.error('Get migraine correlations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching migraine correlations'
    });
  }
});

// Get data for risk prediction (last 24 hours + correlation patterns)
app.get('/api/risk-prediction/data', authenticate, async (req, res) => {
  try {
    // Get last 24 hours of wearable data
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const wearableDataResult = await query(
      `SELECT timestamp, stress_value, recovery_value, heart_rate, hrv,
              sleep_efficiency, sleep_heart_rate, skin_temperature, restless_periods
       FROM wearable_data
       WHERE user_id = $1 
         AND timestamp >= $2 
         AND timestamp <= $3
       ORDER BY timestamp`,
      [req.userId, twentyFourHoursAgo, now]
    );

    // Get correlation patterns
    const correlationsResult = await query(
      `SELECT pattern_type, pattern_name, pattern_definition, threshold_value,
              correlation_strength, confidence_score
       FROM migraine_correlations
       WHERE user_id = $1
       ORDER BY confidence_score DESC, ABS(correlation_strength) DESC`,
      [req.userId]
    );

    // Format wearable data
    const wearableData = wearableDataResult.rows.map(row => ({
      timestamp: row.timestamp.toISOString(),
      stress: row.stress_value ? parseFloat(row.stress_value) : null,
      recovery: row.recovery_value ? parseFloat(row.recovery_value) : null,
      heartRate: row.heart_rate ? parseFloat(row.heart_rate) : null,
      hrv: row.hrv ? parseFloat(row.hrv) : null,
      sleepEfficiency: row.sleep_efficiency ? parseFloat(row.sleep_efficiency) : null,
      sleepHeartRate: row.sleep_heart_rate ? parseFloat(row.sleep_heart_rate) : null,
      skinTemperature: row.skin_temperature ? parseFloat(row.skin_temperature) : null,
      restlessPeriods: row.restless_periods ? parseFloat(row.restless_periods) : null
    }));

    // Format correlation patterns
    const patterns = correlationsResult.rows.map(row => ({
      patternType: row.pattern_type,
      patternName: row.pattern_name,
      patternDefinition: row.pattern_definition,
      thresholdValue: row.threshold_value ? parseFloat(row.threshold_value) : null,
      correlationStrength: row.correlation_strength ? parseFloat(row.correlation_strength) : null,
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : null
    }));

    res.json({
      success: true,
      data: {
        wearableData,
        patterns,
        timeRange: {
          start: twentyFourHoursAgo.toISOString(),
          end: now.toISOString()
        },
        dataPointsCount: wearableData.length,
        patternsCount: patterns.length
      }
    });
  } catch (error) {
    console.error('Get risk prediction data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching risk prediction data'
    });
  }
});

// Build AI prompt for migraine risk analysis (with optional simulated data)
app.post('/api/risk-prediction/prompt', authenticate, async (req, res) => {
  try {
    const { simulatedData } = req.body;
    
    // Get last 24 hours of wearable data (or use simulated)
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let wearableData = [];
    
    if (simulatedData) {
      // Use simulated data - create 24 hourly entries with the simulated values
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
        wearableData.push({
          timestamp: timestamp.toISOString(),
          stress: simulatedData.stress || null,
          recovery: simulatedData.recovery || null,
          heartRate: simulatedData.heartRate || null,
          hrv: simulatedData.hrv || null,
          sleepEfficiency: simulatedData.sleepEfficiency || null,
          sleepHeartRate: null,
          skinTemperature: simulatedData.skinTemp || null,
          restlessPeriods: null
        });
      }
    } else {
      // Get actual wearable data from database
      const wearableDataResult = await query(
        `SELECT timestamp, stress_value, recovery_value, heart_rate, hrv,
                sleep_efficiency, sleep_heart_rate, skin_temperature, restless_periods
         FROM wearable_data
         WHERE user_id = $1 
           AND timestamp >= $2 
           AND timestamp <= $3
         ORDER BY timestamp`,
        [req.userId, twentyFourHoursAgo, now]
      );

      wearableData = wearableDataResult.rows.map(row => ({
        timestamp: row.timestamp.toISOString(),
        stress: row.stress_value ? parseFloat(row.stress_value) : null,
        recovery: row.recovery_value ? parseFloat(row.recovery_value) : null,
        heartRate: row.heart_rate ? parseFloat(row.heart_rate) : null,
        hrv: row.hrv ? parseFloat(row.hrv) : null,
        sleepEfficiency: row.sleep_efficiency ? parseFloat(row.sleep_efficiency) : null,
        sleepHeartRate: row.sleep_heart_rate ? parseFloat(row.sleep_heart_rate) : null,
        skinTemperature: row.skin_temperature ? parseFloat(row.skin_temperature) : null,
        restlessPeriods: row.restless_periods ? parseFloat(row.restless_periods) : null
      }));
    }

    // Get correlation patterns
    const correlationsResult = await query(
      `SELECT pattern_type, pattern_name, pattern_definition, threshold_value,
              correlation_strength, confidence_score, 
              avg_value_on_migraine_days, avg_value_on_normal_days,
              migraine_days_count, total_days_analyzed
       FROM migraine_correlations
       WHERE user_id = $1
       ORDER BY ABS(correlation_strength) DESC`,
      [req.userId]
    );

    // Get user profile
    const profileResult = await query(
      `SELECT typical_duration, monthly_frequency, diagnosed_type,
              experiences_nausea, experiences_vomit, experiences_photophobia, experiences_phonophobia,
              typical_visual_symptoms, typical_sensory_symptoms, family_history
       FROM user_profiles
       WHERE user_id = $1`,
      [req.userId]
    );

    // Format correlation patterns
    const patterns = correlationsResult.rows.map(row => ({
      patternType: row.pattern_type,
      patternName: row.pattern_name,
      patternDefinition: row.pattern_definition,
      thresholdValue: row.threshold_value ? parseFloat(row.threshold_value) : null,
      correlationStrength: row.correlation_strength ? parseFloat(row.correlation_strength) : null,
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : null,
      avgValueOnMigraineDays: row.avg_value_on_migraine_days ? parseFloat(row.avg_value_on_migraine_days) : null,
      avgValueOnNormalDays: row.avg_value_on_normal_days ? parseFloat(row.avg_value_on_normal_days) : null,
      migraineDaysCount: parseInt(row.migraine_days_count) || 0,
      totalDaysAnalyzed: parseInt(row.total_days_analyzed) || 0
    }));

    // Format user profile
    const profile = profileResult.rows[0] ? {
      typicalDuration: profileResult.rows[0].typical_duration,
      monthlyFrequency: profileResult.rows[0].monthly_frequency,
      diagnosedType: profileResult.rows[0].diagnosed_type,
      experiencesNausea: profileResult.rows[0].experiences_nausea,
      experiencesVomit: profileResult.rows[0].experiences_vomit,
      experiencesPhotophobia: profileResult.rows[0].experiences_photophobia,
      experiencesPhonophobia: profileResult.rows[0].experiences_phonophobia,
      typicalVisualSymptoms: profileResult.rows[0].typical_visual_symptoms,
      typicalSensorySymptoms: profileResult.rows[0].typical_sensory_symptoms,
      familyHistory: profileResult.rows[0].family_history
    } : null;

    // Build the prompt
    const prompt = buildRiskAnalysisPrompt({
      wearableData,
      patterns,
      profile,
      isSimulated: !!simulatedData
    });

    // Build summary for quick reference
    const summary = buildDataSummary({
      wearableData,
      patterns,
      profile
    });

    res.json({
      success: true,
      data: {
        prompt,
        summary,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataPointsCount: wearableData.length,
          patternsCount: patterns.length,
          hasProfile: !!profile,
          usingSimulatedData: !!simulatedData,
          timeRange: {
            start: twentyFourHoursAgo.toISOString(),
            end: now.toISOString()
          }
        }
      }
    });
  } catch (error) {
    console.error('Build risk prediction prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Error building risk prediction prompt',
      error: error.message
    });
  }
});

// Build AI prompt for migraine risk analysis (GET - fallback)
app.get('/api/risk-prediction/prompt', authenticate, async (req, res) => {
  try {
    // Get last 24 hours of wearable data
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const wearableDataResult = await query(
      `SELECT timestamp, stress_value, recovery_value, heart_rate, hrv,
              sleep_efficiency, sleep_heart_rate, skin_temperature, restless_periods
       FROM wearable_data
       WHERE user_id = $1 
         AND timestamp >= $2 
         AND timestamp <= $3
       ORDER BY timestamp`,
      [req.userId, twentyFourHoursAgo, now]
    );

    // Get correlation patterns
    const correlationsResult = await query(
      `SELECT pattern_type, pattern_name, pattern_definition, threshold_value,
              correlation_strength, confidence_score, 
              avg_value_on_migraine_days, avg_value_on_normal_days,
              migraine_days_count, total_days_analyzed
       FROM migraine_correlations
       WHERE user_id = $1
       ORDER BY ABS(correlation_strength) DESC`,
      [req.userId]
    );

    // Get user profile
    const profileResult = await query(
      `SELECT typical_duration, monthly_frequency, diagnosed_type,
              experiences_nausea, experiences_vomit, experiences_photophobia, experiences_phonophobia,
              typical_visual_symptoms, typical_sensory_symptoms, family_history
       FROM user_profiles
       WHERE user_id = $1`,
      [req.userId]
    );

    // Format wearable data
    const wearableData = wearableDataResult.rows.map(row => ({
      timestamp: row.timestamp.toISOString(),
      stress: row.stress_value ? parseFloat(row.stress_value) : null,
      recovery: row.recovery_value ? parseFloat(row.recovery_value) : null,
      heartRate: row.heart_rate ? parseFloat(row.heart_rate) : null,
      hrv: row.hrv ? parseFloat(row.hrv) : null,
      sleepEfficiency: row.sleep_efficiency ? parseFloat(row.sleep_efficiency) : null,
      sleepHeartRate: row.sleep_heart_rate ? parseFloat(row.sleep_heart_rate) : null,
      skinTemperature: row.skin_temperature ? parseFloat(row.skin_temperature) : null,
      restlessPeriods: row.restless_periods ? parseFloat(row.restless_periods) : null
    }));

    // Format correlation patterns
    const patterns = correlationsResult.rows.map(row => ({
      patternType: row.pattern_type,
      patternName: row.pattern_name,
      patternDefinition: row.pattern_definition,
      thresholdValue: row.threshold_value ? parseFloat(row.threshold_value) : null,
      correlationStrength: row.correlation_strength ? parseFloat(row.correlation_strength) : null,
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : null,
      avgValueOnMigraineDays: row.avg_value_on_migraine_days ? parseFloat(row.avg_value_on_migraine_days) : null,
      avgValueOnNormalDays: row.avg_value_on_normal_days ? parseFloat(row.avg_value_on_normal_days) : null,
      migraineDaysCount: parseInt(row.migraine_days_count) || 0,
      totalDaysAnalyzed: parseInt(row.total_days_analyzed) || 0
    }));

    // Format user profile
    const profile = profileResult.rows[0] ? {
      typicalDuration: profileResult.rows[0].typical_duration,
      monthlyFrequency: profileResult.rows[0].monthly_frequency,
      diagnosedType: profileResult.rows[0].diagnosed_type,
      experiencesNausea: profileResult.rows[0].experiences_nausea,
      experiencesVomit: profileResult.rows[0].experiences_vomit,
      experiencesPhotophobia: profileResult.rows[0].experiences_photophobia,
      experiencesPhonophobia: profileResult.rows[0].experiences_phonophobia,
      typicalVisualSymptoms: profileResult.rows[0].typical_visual_symptoms,
      typicalSensorySymptoms: profileResult.rows[0].typical_sensory_symptoms,
      familyHistory: profileResult.rows[0].family_history
    } : null;

    // Build the prompt
    const prompt = buildRiskAnalysisPrompt({
      wearableData,
      patterns,
      profile
    });

    // Build summary for quick reference
    const summary = buildDataSummary({
      wearableData,
      patterns,
      profile
    });

    res.json({
      success: true,
      data: {
        prompt,
        summary,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataPointsCount: wearableData.length,
          patternsCount: patterns.length,
          hasProfile: !!profile,
          timeRange: {
            start: twentyFourHoursAgo.toISOString(),
            end: now.toISOString()
          }
        }
      }
    });
  } catch (error) {
    console.error('Build risk prediction prompt error:', error);
    res.status(500).json({
      success: false,
      message: 'Error building risk prediction prompt',
      error: error.message
    });
  }
});

// Get summary indicators for a date range
app.get('/api/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, limit = '30' } = req.query;
    
    let queryText = `
      SELECT id, period_start, period_end,
             avg_stress, max_stress, stress_volatility, stress_trend,
             avg_recovery, min_recovery, recovery_trend,
             avg_heart_rate, resting_heart_rate, max_heart_rate,
             avg_hrv, hrv_trend, hrv_volatility,
             avg_sleep_efficiency, avg_sleep_heart_rate, avg_restless_periods,
             avg_skin_temperature, temperature_variation,
             overall_wellness_score, risk_factors, data_points_count,
             processed_at, created_at, updated_at
      FROM summary_indicators
      WHERE user_id = $1
    `;
    const queryParams = [req.userId];

    if (startDate) {
      queryText += ` AND period_start >= $${queryParams.length + 1}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      queryText += ` AND period_end <= $${queryParams.length + 1}`;
      queryParams.push(endDate);
    }

    queryText += ` ORDER BY period_start DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(parseInt(limit));

    const result = await query(queryText, queryParams);

    const summaries = result.rows.map(row => ({
      id: row.id,
      periodStart: row.period_start.toISOString(),
      periodEnd: row.period_end.toISOString(),
      stress: {
        avg: row.avg_stress ? parseFloat(row.avg_stress) : null,
        max: row.max_stress ? parseFloat(row.max_stress) : null,
        volatility: row.stress_volatility ? parseFloat(row.stress_volatility) : null,
        trend: row.stress_trend
      },
      recovery: {
        avg: row.avg_recovery ? parseFloat(row.avg_recovery) : null,
        min: row.min_recovery ? parseFloat(row.min_recovery) : null,
        trend: row.recovery_trend
      },
      heartRate: {
        avg: row.avg_heart_rate ? parseFloat(row.avg_heart_rate) : null,
        resting: row.resting_heart_rate ? parseFloat(row.resting_heart_rate) : null,
        max: row.max_heart_rate ? parseFloat(row.max_heart_rate) : null
      },
      hrv: {
        avg: row.avg_hrv ? parseFloat(row.avg_hrv) : null,
        trend: row.hrv_trend,
        volatility: row.hrv_volatility ? parseFloat(row.hrv_volatility) : null
      },
      sleep: {
        efficiency: row.avg_sleep_efficiency ? parseFloat(row.avg_sleep_efficiency) : null,
        heartRate: row.avg_sleep_heart_rate ? parseFloat(row.avg_sleep_heart_rate) : null,
        restlessPeriods: row.avg_restless_periods ? parseFloat(row.avg_restless_periods) : null
      },
      temperature: {
        avg: row.avg_skin_temperature ? parseFloat(row.avg_skin_temperature) : null,
        variation: row.temperature_variation ? parseFloat(row.temperature_variation) : null
      },
      overallWellnessScore: row.overall_wellness_score ? parseFloat(row.overall_wellness_score) : null,
      riskFactors: row.risk_factors || [],
      dataPointsCount: parseInt(row.data_points_count) || 0,
      processedAt: row.processed_at.toISOString(),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    }));

    res.json({
      success: true,
      data: {
        summaries,
        count: summaries.length
      }
    });
  } catch (error) {
    console.error('Get summary indicators error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching summary indicators'
    });
  }
});

// Get wearable data statistics
app.get('/api/wearable/statistics', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let queryText = `
      SELECT 
        COUNT(*) as total_records,
        AVG(stress_value) as avg_stress,
        AVG(recovery_value) as avg_recovery,
        AVG(heart_rate) as avg_heart_rate,
        AVG(hrv) as avg_hrv,
        AVG(sleep_efficiency) as avg_sleep_efficiency,
        AVG(sleep_heart_rate) as avg_sleep_heart_rate,
        AVG(skin_temperature) as avg_skin_temperature,
        MIN(timestamp) as earliest_date,
        MAX(timestamp) as latest_date
      FROM wearable_data
      WHERE user_id = $1
    `;
    const queryParams = [req.userId];

    if (startDate) {
      queryText += ` AND timestamp >= $${queryParams.length + 1}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      queryText += ` AND timestamp <= $${queryParams.length + 1}`;
      queryParams.push(endDate);
    }

    const result = await query(queryText, queryParams);
    const stats = result.rows[0];

    // Get hourly breakdown for sample day
    const hourlyResult = await query(
      `SELECT DATE(timestamp) as date, COUNT(*) as entries_per_day
       FROM wearable_data
       WHERE user_id = $1
       GROUP BY DATE(timestamp)
       ORDER BY date DESC
       LIMIT 10`,
      [req.userId]
    );

    res.json({
      success: true,
      data: {
        totalRecords: parseInt(stats.total_records) || 0,
        averages: {
          stress: stats.avg_stress ? parseFloat(stats.avg_stress) : null,
          recovery: stats.avg_recovery ? parseFloat(stats.avg_recovery) : null,
          heartRate: stats.avg_heart_rate ? parseFloat(stats.avg_heart_rate) : null,
          hrv: stats.avg_hrv ? parseFloat(stats.avg_hrv) : null,
          sleepEfficiency: stats.avg_sleep_efficiency ? parseFloat(stats.avg_sleep_efficiency) : null,
          sleepHeartRate: stats.avg_sleep_heart_rate ? parseFloat(stats.avg_sleep_heart_rate) : null,
          skinTemperature: stats.avg_skin_temperature ? parseFloat(stats.avg_skin_temperature) : null
        },
        dateRange: {
          earliest: stats.earliest_date ? stats.earliest_date.toISOString() : null,
          latest: stats.latest_date ? stats.latest_date.toISOString() : null
        },
        entriesPerDay: hourlyResult.rows.map(r => ({
          date: typeof r.date === 'string' ? r.date : r.date.toISOString().split('T')[0],
          count: parseInt(r.entries_per_day)
        }))
      }
    });
  } catch (error) {
    console.error('Get wearable statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wearable statistics'
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await query('SELECT 1');
    
    res.json({
      success: true,
      message: 'Migraine Tracker API is running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

app.listen(PORT, () => {
  console.log(`🚀 Migraine Tracker API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`\n📝 Available endpoints:`);
  console.log(`   POST   /api/auth/register`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   POST   /api/auth/logout`);
  console.log(`   GET    /api/auth/me`);
  console.log(`   GET    /api/migraine`);
  console.log(`   GET    /api/migraine/:id`);
  console.log(`   POST   /api/migraine`);
  console.log(`   PUT    /api/migraine/:id`);
  console.log(`   DELETE /api/migraine/:id`);
  console.log(`   GET    /api/migraine/statistics`);
  console.log(`   GET    /api/migraine/recent`);
  console.log(`   POST   /api/wearable/upload`);
  console.log(`   GET    /api/wearable`);
  console.log(`   GET    /api/wearable/statistics`);
  console.log(`   GET    /api/wearable/uploads`);
  console.log(`   GET    /api/wearable/uploads/:id`);
  console.log(`   DELETE /api/wearable/uploads/:id`);
  console.log(`   DELETE /api/wearable/uploads (delete all)`);
  console.log(`   POST   /api/wearable/cleanup-orphaned`);
  console.log(`   GET    /api/calendar`);
  console.log(`   POST   /api/calendar/migraine-day`);
  console.log(`   DELETE /api/calendar/migraine-day/:date`);
  console.log(`   POST   /api/summary/process`);
  console.log(`   GET    /api/summary`);
  console.log(`   GET    /api/summary/correlations`);
  console.log(`   GET    /api/risk-prediction/data`);
  console.log(`   POST   /api/risk-prediction/prompt (with simulated data)`);
  console.log(`   GET    /api/risk-prediction/prompt`);
  console.log(`\n🔐 Demo user: demo@example.com / demo123`);
});
