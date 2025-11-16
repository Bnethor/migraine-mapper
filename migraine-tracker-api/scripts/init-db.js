#!/usr/bin/env node
/**
 * Database Initialization Script
 * 
 * This script initializes the database schema by running all migration files in order.
 * Run this once after creating a new database instance (e.g., on Render).
 * 
 * Usage:
 *   node scripts/init-db.js
 * 
 * Or with environment variables:
 *   DB_HOST=localhost DB_USER=user DB_PASSWORD=pass DB_NAME=db node scripts/init-db.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query, closePool } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATION_FILES = [
  'init.sql',
  'migration_001_add_clinical_fields.sql',
  'migration_002_user_profile.sql',
  'migration_003_wearable_data.sql',
  'migration_004_upload_sessions.sql',
  'migration_005_migraine_day_markers.sql',
  'migration_006_summary_indicators.sql',
  'migration_007_migraine_correlations.sql',
];

async function runMigrations() {
  console.log('🚀 Starting database initialization...\n');

  try {
    for (const file of MIGRATION_FILES) {
      const filePath = join(__dirname, '..', 'db', file);
      console.log(`📄 Running ${file}...`);
      
      try {
        const sql = readFileSync(filePath, 'utf8');
        
        // Split by semicolons and execute each statement
        // This handles multi-statement SQL files
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          if (statement.trim()) {
            await query(statement);
          }
        }
        
        console.log(`✅ ${file} completed successfully\n`);
      } catch (error) {
        // Some errors are expected (like "table already exists")
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('ON CONFLICT')) {
          console.log(`⚠️  ${file} - Some statements skipped (already applied)\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Database initialization completed successfully!');
    console.log('\n📊 Database is ready to use.');
    console.log('👤 Demo user: demo@example.com / demo123');
  } catch (error) {
    console.error('❌ Error during database initialization:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run migrations
runMigrations();

