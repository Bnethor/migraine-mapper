import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { query, closePool } from './db/database.js';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// HELPER FUNCTIONS
// ============================================

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
      `SELECT id, user_id, start_time, end_time, intensity, location,
              triggers, symptoms, medication, notes, created_at, updated_at
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
      SELECT id, user_id, start_time, end_time, intensity, location,
             triggers, symptoms, medication, notes, created_at, updated_at
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
      `SELECT id, user_id, start_time, end_time, intensity, location,
              triggers, symptoms, medication, notes, created_at, updated_at
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
      notes
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
       (user_id, start_time, end_time, intensity, location, triggers, symptoms, medication, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, start_time, end_time, intensity, location,
                 triggers, symptoms, medication, notes, created_at, updated_at`,
      [
        req.userId,
        startDateTime,
        endDateTime,
        parseInt(intensity),
        location || '',
        triggersStr,
        symptomsStr,
        medication || '',
        notes || ''
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
      notes
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
           notes = COALESCE($8, notes)
       WHERE id = $9
       RETURNING id, user_id, start_time, end_time, intensity, location,
                 triggers, symptoms, medication, notes, created_at, updated_at`,
      [
        startDateTime,
        endDateTime,
        intensity ? parseInt(intensity) : null,
        location,
        triggersStr,
        symptomsStr,
        medication,
        notes,
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
  console.log(`\n🔐 Demo user: demo@example.com / demo123`);
});
