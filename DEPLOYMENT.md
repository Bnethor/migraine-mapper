# 🚀 Deployment Guide for Render

This guide will help you deploy both the frontend and backend of the Migraine Tracker application to Render.

## 📋 Prerequisites

1. A [Render account](https://render.com) (free tier available)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Basic understanding of environment variables

## 🎯 Render Free Tier Overview

**Free Tier Includes:**
- **Web Services**: Free, but spins down after 15 minutes of inactivity (takes ~30 seconds to wake up)
- **PostgreSQL Database**: Free for 90 days, then $7/month
- **Static Sites**: Free and always on

**Alternative Free Options:**
- **Railway**: Similar free tier, better for always-on services
- **Fly.io**: Free tier with better uptime
- **Supabase**: Free PostgreSQL + hosting options

## 📦 Deployment Steps

### Option 1: Using render.yaml (Recommended - One-Click Deploy)

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Go to Render Dashboard** → [New](https://dashboard.render.com/new)

3. **Select "Blueprint"** (or "Infrastructure as Code")

4. **Connect your repository** and select the branch

5. **Render will detect `render.yaml`** and create all services automatically

6. **After deployment, update the frontend environment variable:**
   - Go to your `migraine-tracker-web` service
   - Navigate to **Environment** tab
   - Set `VITE_API_BASE_URL` to: `https://your-api-service.onrender.com/api`
   - Redeploy the frontend service

### Option 2: Manual Deployment

#### Step 1: Deploy PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **PostgreSQL**
2. Configure:
   - **Name**: `migraine-tracker-db`
   - **Database**: `migrainetracker`
   - **User**: `migraineuser`
   - **Plan**: Free (or paid for always-on)
3. Click **Create Database**
4. **Save the connection details** - you'll need them for the backend

#### Step 2: Deploy Backend API

1. Go to **New** → **Web Service**
2. Connect your repository
3. Configure:
   - **Name**: `migraine-tracker-api`
   - **Environment**: `Node`
   - **Build Command**: `cd migraine-tracker-api && npm install`
   - **Start Command**: `cd migraine-tracker-api && npm start`
   - **Plan**: Free
4. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=<generate-a-random-secret-key>
   DB_HOST=<from-database-connection-string>
   DB_PORT=<from-database-connection-string>
   DB_USER=<from-database-connection-string>
   DB_PASSWORD=<from-database-connection-string>
   DB_NAME=migrainetracker
   ```
5. Click **Create Web Service**
6. **Wait for deployment** and note the URL (e.g., `https://migraine-tracker-api.onrender.com`)

#### Step 3: Initialize Database

The database needs to be initialized with the schema. You have two options:

**Option A: Run migrations manually (Recommended)**
1. Connect to your Render database using a PostgreSQL client
2. Run the SQL files from `migraine-tracker-api/db/` in order:
   - `init.sql`
   - `migration_001_add_clinical_fields.sql`
   - `migration_002_user_profile.sql`
   - `migration_003_wearable_data.sql`
   - `migration_004_upload_sessions.sql`
   - `migration_005_migraine_day_markers.sql`
   - `migration_006_summary_indicators.sql`
   - `migration_007_migraine_correlations.sql`

**Option B: Add initialization script to backend**
- We can create a migration script that runs on startup (see below)

#### Step 4: Deploy Frontend

1. Go to **New** → **Static Site**
2. Connect your repository
3. Configure:
   - **Name**: `migraine-tracker-web`
   - **Build Command**: `cd migraine-tracker-web && npm install && npm run build`
   - **Publish Directory**: `migraine-tracker-web/dist`
   - **Plan**: Free
4. **Add Environment Variable:**
   ```
   VITE_API_BASE_URL=https://your-api-service.onrender.com/api
   ```
   Replace `your-api-service` with your actual backend service name
5. Click **Create Static Site**

## 🔧 Post-Deployment Configuration

### 1. Update CORS Settings (if needed)

If you encounter CORS errors, update `migraine-tracker-api/server.js`:

```javascript
app.use(cors({
  origin: ['https://your-frontend-url.onrender.com', 'http://localhost:5173'],
  credentials: true
}));
```

### 2. Database Initialization

After the first deployment, you need to initialize the database schema. You can:

1. **Use Render's Shell** (easiest):
   - Go to your database service → **Connect** → **Shell**
   - Or use a local PostgreSQL client with the connection string

2. **Create an initialization endpoint** (we can add this)

### 3. Test Your Deployment

1. Visit your frontend URL
2. Try registering a new user
3. Check backend logs for any errors

## 🔐 Environment Variables Reference

### Backend (`migraine-tracker-api`)
```
NODE_ENV=production
PORT=10000
JWT_SECRET=<random-secret-key>
DB_HOST=<from-render-database>
DB_PORT=<from-render-database>
DB_USER=<from-render-database>
DB_PASSWORD=<from-render-database>
DB_NAME=migrainetracker
```

### Frontend (`migraine-tracker-web`)
```
VITE_API_BASE_URL=https://your-api-service.onrender.com/api
```

## ⚠️ Important Notes

1. **Free Tier Limitations:**
   - Backend spins down after 15 min inactivity (first request takes ~30s)
   - Database is free for 90 days, then $7/month
   - Consider upgrading to paid plan for production use

2. **Database Persistence:**
   - Data persists even when backend spins down
   - Make sure to run migrations before first use

3. **Environment Variables:**
   - Frontend env vars must be set at build time
   - If you change `VITE_API_BASE_URL`, you need to redeploy

4. **Custom Domain:**
   - Render allows custom domains on free tier
   - Go to service settings → **Custom Domains**

## 🆘 Troubleshooting

### Backend won't start
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure database is accessible

### Frontend can't connect to API
- Verify `VITE_API_BASE_URL` is correct
- Check CORS settings in backend
- Ensure backend is running (may need to wake it up)

### Database connection errors
- Verify database credentials
- Check database is running
- Ensure network access is allowed

### 401 Unauthorized errors
- Check JWT_SECRET is set
- Verify token is being sent in requests

## 🚀 Alternative Free Hosting Options

### Railway (Recommended for Always-On)
- Free $5/month credit
- Better for always-on services
- Easy PostgreSQL setup
- [railway.app](https://railway.app)

### Fly.io
- Generous free tier
- Better uptime than Render free tier
- [fly.io](https://fly.io)

### Supabase
- Free PostgreSQL database
- Can host backend as Edge Functions
- [supabase.com](https://supabase.com)

### Vercel (Frontend) + Railway (Backend)
- Vercel: Best for frontend (always free)
- Railway: Better backend hosting
- [vercel.com](https://vercel.com) + [railway.app](https://railway.app)

## 📝 Next Steps

1. Set up database migrations to run automatically
2. Add health check endpoints
3. Set up monitoring/logging
4. Configure custom domain
5. Set up CI/CD for automatic deployments

