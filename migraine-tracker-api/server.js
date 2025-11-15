import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import 'dotenv/config';
import { query, closePool } from './db/database.js';
import { parseWearableCSV, detectSource } from './utils/csvParser.js';

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
    // Get total entries and average intensity
    const statsResult = await query(
      `SELECT 
         COUNT(*) as total_entries,
         COALESCE(AVG(intensity), 0) as average_intensity
       FROM migraine_entries
       WHERE user_id = $1`,
      [req.userId]
    );

    const { total_entries, average_intensity } = statsResult.rows[0];

    // Get top triggers
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

    const topTriggers = Object.entries(triggerCounts)
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get monthly frequency (last 6 months)
    const monthlyResult = await query(
      `SELECT 
         TO_CHAR(start_time, 'Mon YYYY') as month,
         COUNT(*) as count
       FROM migraine_entries
       WHERE user_id = $1
         AND start_time >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(start_time, 'YYYY-MM'), TO_CHAR(start_time, 'Mon YYYY')
       ORDER BY TO_CHAR(start_time, 'YYYY-MM')`,
      [req.userId]
    );

    // Fill in missing months with zero counts
    const monthlyFrequency = [];
    const now = new Date();
    const monthMap = new Map(monthlyResult.rows.map(row => [row.month, parseInt(row.count)]));

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
        totalEntries: parseInt(total_entries),
        averageIntensity: Math.round(parseFloat(average_intensity) * 10) / 10,
        mostCommonTriggers: topTriggers,
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

    // Insert data into database
    const insertedRows = [];
    const errors = [];

    for (const row of parsedData.data) {
      try {
        // Check if record already exists (same user, same timestamp)
        const existing = await query(
          `SELECT id FROM wearable_data 
           WHERE user_id = $1 AND timestamp = $2`,
          [req.userId, row.timestamp]
        );

        if (existing.rows.length > 0) {
          // Update existing record
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
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $11 AND timestamp = $12
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
              req.userId,
              row.timestamp
            ]
          );
          insertedRows.push(result.rows[0].id);
        } else {
          // Insert new record
          const result = await query(
            `INSERT INTO wearable_data 
             (user_id, timestamp, stress_value, recovery_value, heart_rate, hrv,
              sleep_efficiency, sleep_heart_rate, skin_temperature, restless_periods,
              additional_data, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
              source
            ]
          );
          insertedRows.push(result.rows[0].id);
        }
      } catch (error) {
        console.error('Error inserting row:', error);
        errors.push({
          timestamp: row.timestamp,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        inserted: insertedRows.length,
        total: parsedData.data.length,
        errors: errors.length,
        source,
        fieldMapping: parsedData.fieldMapping,
        unrecognizedFields: parsedData.unrecognizedFields,
        errorDetails: errors.length > 0 ? errors : undefined
      },
      message: `Successfully processed ${insertedRows.length} of ${parsedData.data.length} rows`
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
        }
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
  console.log(`\n🔐 Demo user: demo@example.com / demo123`);
});
