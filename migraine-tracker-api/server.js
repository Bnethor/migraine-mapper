import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// IN-MEMORY DATA STORAGE
// ============================================

// Users database (email -> user object)
const users = new Map();

// Migraine entries database (id -> entry object)
const migraines = new Map();

// User-to-migraines mapping (userId -> [migrainIds])
const userMigraines = new Map();

// ============================================
// SEED DATA - Demo User
// ============================================

// Create demo user for testing
const demoUserId = 'demo-user-123';
const demoUser = {
  id: demoUserId,
  email: 'demo@example.com',
  name: 'Demo User',
  password: 'demo123',
  createdAt: new Date().toISOString()
};

users.set('demo@example.com', demoUser);
userMigraines.set(demoUserId, []);

console.log('✅ Demo user created: demo@example.com / demo123');

// ============================================
// HELPER FUNCTIONS
// ============================================

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

// Get user's migraine entries
const getUserMigraines = (userId) => {
  const migraineIds = userMigraines.get(userId) || [];
  return migraineIds.map(id => migraines.get(id)).filter(Boolean);
};

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Register new user
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  // Check if user already exists
  if (users.has(email)) {
    return res.status(400).json({
      success: false,
      message: 'User already exists'
    });
  }

  // Create new user
  const userId = uuidv4();
  const user = {
    id: userId,
    email,
    name: name || email.split('@')[0],
    createdAt: new Date().toISOString()
  };

  users.set(email, { ...user, password });
  userMigraines.set(userId, []);

  // Generate token
  const token = generateToken(userId);

  res.status(201).json({
    success: true,
    data: {
      user,
      token
    }
  });
});

// Login user
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  // Find user
  const user = users.get(email);

  if (!user || user.password !== password) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Generate token
  const token = generateToken(user.id);

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      token
    }
  });
});

// Logout user (client-side only, token invalidation would require a blacklist)
app.post('/api/auth/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user
app.get('/api/auth/me', authenticate, (req, res) => {
  const user = Array.from(users.values()).find(u => u.id === req.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: userWithoutPassword
  });
});

// ============================================
// MIGRAINE ROUTES
// ============================================
// IMPORTANT: Specific routes (statistics, recent) must come BEFORE parameterized routes (:id)

// Get dashboard statistics
app.get('/api/migraine/statistics', authenticate, (req, res) => {
  const userEntries = getUserMigraines(req.userId);

  if (userEntries.length === 0) {
    return res.json({
      success: true,
      data: {
        totalEntries: 0,
        averageIntensity: 0,
        topTriggers: [],
        monthlyFrequency: []
      }
    });
  }

  // Calculate statistics
  const totalEntries = userEntries.length;
  const averageIntensity = userEntries.reduce((sum, entry) => sum + entry.intensity, 0) / totalEntries;

  // Top triggers
  const triggerCounts = {};
  userEntries.forEach(entry => {
    if (entry.triggers) {
      entry.triggers.split(',').forEach(trigger => {
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

  // Monthly frequency (last 6 months)
  const monthlyFrequency = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = month.toLocaleString('default', { month: 'short', year: 'numeric' });
    const count = userEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      return entryDate.getMonth() === month.getMonth() && 
             entryDate.getFullYear() === month.getFullYear();
    }).length;
    
    monthlyFrequency.push({ month: monthStr, count });
  }

  res.json({
    success: true,
    data: {
      totalEntries,
      averageIntensity: Math.round(averageIntensity * 10) / 10,
      topTriggers,
      monthlyFrequency
    }
  });
});

// Get recent entries
app.get('/api/migraine/recent', authenticate, (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const userEntries = getUserMigraines(req.userId);

  // Sort by date and get recent ones
  const recentEntries = userEntries
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .slice(0, limit);

  res.json({
    success: true,
    data: recentEntries
  });
});

// Get all migraine entries (with pagination)
app.get('/api/migraine', authenticate, (req, res) => {
  const { page = '1', limit = '10', search = '' } = req.query;
  
  let userEntries = getUserMigraines(req.userId);

  // Filter by search if provided
  if (search) {
    const searchLower = search.toLowerCase();
    userEntries = userEntries.filter(entry => 
      entry.triggers?.toLowerCase().includes(searchLower) ||
      entry.symptoms?.toLowerCase().includes(searchLower) ||
      entry.location?.toLowerCase().includes(searchLower)
    );
  }

  // Sort by date (newest first)
  userEntries.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedEntries = userEntries.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      entries: paginatedEntries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: userEntries.length,
        pages: Math.ceil(userEntries.length / limitNum)
      }
    }
  });
});

// Get single migraine entry
app.get('/api/migraine/:id', authenticate, (req, res) => {
  const entry = migraines.get(req.params.id);

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Migraine entry not found'
    });
  }

  // Check if entry belongs to user
  if (entry.userId !== req.userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: entry
  });
});

// Create new migraine entry
app.post('/api/migraine', authenticate, (req, res) => {
  const {
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
  if (!startTime || !intensity) {
    return res.status(400).json({
      success: false,
      message: 'Start time and intensity are required'
    });
  }

  // Create new entry
  const entryId = uuidv4();
  const entry = {
    id: entryId,
    userId: req.userId,
    startTime,
    endTime: endTime || null,
    intensity: parseInt(intensity),
    location: location || '',
    triggers: triggers || '',
    symptoms: symptoms || '',
    medication: medication || '',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  migraines.set(entryId, entry);
  
  // Add to user's migraines
  const userMigraineList = userMigraines.get(req.userId) || [];
  userMigraineList.push(entryId);
  userMigraines.set(req.userId, userMigraineList);

  res.status(201).json({
    success: true,
    data: entry
  });
});

// Update migraine entry
app.put('/api/migraine/:id', authenticate, (req, res) => {
  const entry = migraines.get(req.params.id);

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Migraine entry not found'
    });
  }

  // Check if entry belongs to user
  if (entry.userId !== req.userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Update entry
  const updatedEntry = {
    ...entry,
    ...req.body,
    id: entry.id, // Preserve ID
    userId: entry.userId, // Preserve user ID
    createdAt: entry.createdAt, // Preserve creation date
    updatedAt: new Date().toISOString()
  };

  migraines.set(req.params.id, updatedEntry);

  res.json({
    success: true,
    data: updatedEntry
  });
});

// Delete migraine entry
app.delete('/api/migraine/:id', authenticate, (req, res) => {
  const entry = migraines.get(req.params.id);

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Migraine entry not found'
    });
  }

  // Check if entry belongs to user
  if (entry.userId !== req.userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Delete entry
  migraines.delete(req.params.id);

  // Remove from user's list
  const userMigraineList = userMigraines.get(req.userId) || [];
  const updatedList = userMigraineList.filter(id => id !== req.params.id);
  userMigraines.set(req.userId, updatedList);

  res.json({
    success: true,
    message: 'Entry deleted successfully'
  });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Migraine Tracker API is running',
    timestamp: new Date().toISOString()
  });
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
});

