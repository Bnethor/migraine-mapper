# 🚀 Deployment Guide

This guide will help you deploy both the frontend and backend of the Migraine Tracker application.

## 📋 Overview

- **Frontend**: Deploy to Vercel (free tier)
- **Backend**: Deploy to Render (free tier with PostgreSQL)

## 🎨 Frontend Deployment (Vercel)

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Go to [Vercel](https://vercel.com)**
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your repository
   - Select the `migraine-tracker-web` folder as the root directory

3. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add: `VITE_API_BASE_URL` = `https://your-api.onrender.com/api`
     (Replace with your actual Render backend URL)

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

### Option 2: Deploy via Vercel CLI

```bash
cd migraine-tracker-web
npm install -g vercel
vercel login
vercel
```

Follow the prompts and add the environment variable when asked.

## 🔧 Backend Deployment (Render)

### Step 1: Prepare Your Backend

1. **Push your code to GitHub** (if not already done)

2. **Create a `render.yaml` file** (already created in `migraine-tracker-api/`)

### Step 2: Deploy on Render

1. **Go to [Render](https://render.com)**
   - Sign up/login with GitHub
   - Click "New +" → "Blueprint"

2. **Connect Your Repository**
   - Select your GitHub repository
   - Render will detect the `render.yaml` file automatically

3. **Configure the Blueprint**
   - Render will create both the web service and PostgreSQL database
   - The database connection will be automatically configured

4. **Manual Setup (Alternative)**
   If you prefer manual setup:
   
   a. **Create PostgreSQL Database**
      - Click "New +" → "PostgreSQL"
      - Name: `migraine-tracker-db`
      - Plan: Free
      - Click "Create Database"
      - Note the connection details
   
   b. **Create Web Service**
      - Click "New +" → "Web Service"
      - Connect your repository
      - Root Directory: `migraine-tracker-api`
      - Build Command: `npm install`
      - Start Command: `npm start`
      - Plan: Free
   
   c. **Add Environment Variables**
      - `NODE_ENV` = `production`
      - `PORT` = `10000` (Render uses port 10000)
      - `JWT_SECRET` = (generate a strong random string)
      - Database variables (from PostgreSQL service):
        - `DB_HOST` = (from database service)
        - `DB_PORT` = (from database service)
        - `DB_USER` = (from database service)
        - `DB_PASSWORD` = (from database service)
        - `DB_NAME` = (from database service)

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy your API

### Step 3: Get Your Backend URL

After deployment, Render will provide a URL like:
```
https://migraine-tracker-api.onrender.com
```

Your API will be available at:
```
https://migraine-tracker-api.onrender.com/api
```

## 🔗 Connect Frontend to Backend

1. **Update Vercel Environment Variable**
   - Go to your Vercel project settings
   - Environment Variables
   - Update `VITE_API_BASE_URL` to: `https://your-api.onrender.com/api`
   - Redeploy the frontend

2. **Update CORS (if needed)**
   - Your backend should already have CORS enabled
   - If you get CORS errors, check `server.js` has:
     ```javascript
     app.use(cors());
     ```

## 🗄️ Database Setup

### Initial Database Schema

After deploying to Render, you need to run your database migrations. Your project has SQL files in `migraine-tracker-api/db/`:

1. **`init.sql`** - Initial schema and demo data
2. **`migration_001_add_clinical_fields.sql`** - Clinical fields
3. **`migration_002_user_profile.sql`** - User profiles
4. **`migration_003_wearable_data.sql`** - Wearable data tables
5. **`migration_004_upload_sessions.sql`** - Upload sessions
6. **`migration_005_migraine_day_markers.sql`** - Calendar markers
7. **`migration_006_summary_indicators.sql`** - Summary indicators
8. **`migration_007_migraine_correlations.sql`** - Correlation tables

### Running Migrations on Render

**Option 1: Using Render's PostgreSQL Dashboard (Easiest)**

1. Go to your Render dashboard
2. Click on your PostgreSQL database service
3. Click "Connect" → "psql" (or use the "Query" tab if available)
4. Copy and paste the contents of each SQL file in order:
   - First: `init.sql`
   - Then: `migration_001_add_clinical_fields.sql`
   - Then: `migration_002_user_profile.sql`
   - Continue with remaining migrations in order

**Option 2: Using psql Command Line**

1. Get your database connection string from Render dashboard
2. Connect via psql:
   ```bash
   psql "postgresql://user:password@host:port/database"
   ```
3. Run each migration file:
   ```bash
   \i init.sql
   \i migration_001_add_clinical_fields.sql
   # ... continue with all migrations
   ```

**Option 3: Using a Database Client**

Use tools like:
- [pgAdmin](https://www.pgadmin.org/)
- [DBeaver](https://dbeaver.io/)
- [TablePlus](https://tableplus.com/)

Connect using the connection details from Render and run the SQL files.

### Migration Order

Run migrations in this exact order:
1. `init.sql`
2. `migration_001_add_clinical_fields.sql`
3. `migration_002_user_profile.sql`
4. `migration_003_wearable_data.sql`
5. `migration_004_upload_sessions.sql`
6. `migration_005_migraine_day_markers.sql`
7. `migration_006_summary_indicators.sql`
8. `migration_007_migraine_correlations.sql`

## 📝 Environment Variables Summary

### Frontend (Vercel)
- `VITE_API_BASE_URL` - Your Render backend URL (e.g., `https://migraine-tracker-api.onrender.com/api`)

### Backend (Render)
- `NODE_ENV` - `production`
- `PORT` - `10000` (Render default)
- `JWT_SECRET` - Strong random string
- `DB_HOST` - From PostgreSQL service
- `DB_PORT` - From PostgreSQL service
- `DB_USER` - From PostgreSQL service
- `DB_PASSWORD` - From PostgreSQL service
- `DB_NAME` - From PostgreSQL service

## 🆓 Free Tier Limitations

### Vercel
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Global CDN
- ⚠️ 100GB bandwidth/month
- ⚠️ Serverless function limits

### Render
- ✅ Free PostgreSQL database (90 days, then $7/month)
- ✅ Free web service (spins down after 15 min inactivity)
- ⚠️ First request after inactivity may be slow (cold start)
- ⚠️ 750 hours/month free tier

## 🔍 Troubleshooting

### Backend Issues

1. **Database Connection Errors**
   - Verify all database environment variables are set correctly
   - Check that the PostgreSQL service is running
   - Ensure the database name matches

2. **Port Issues**
   - Render uses port 10000 by default
   - Make sure your `PORT` env var is set to `10000`

3. **Build Failures**
   - Check Render build logs
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

### Frontend Issues

1. **API Connection Errors**
   - Verify `VITE_API_BASE_URL` is set correctly in Vercel
   - Check browser console for CORS errors
   - Ensure backend is deployed and running

2. **Build Failures**
   - Check Vercel build logs
   - Ensure all dependencies are installed
   - Verify TypeScript compilation

## 🚀 Alternative Backend Hosting Options

If Render doesn't work for you, here are other free options:

### Railway
- Free tier: $5 credit/month
- Easy PostgreSQL setup
- Fast deployments

### Fly.io
- Free tier: 3 shared VMs
- Good for global distribution
- PostgreSQL available

### Heroku
- Limited free tier
- Easy setup
- PostgreSQL addon available

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [PostgreSQL on Render](https://render.com/docs/databases)

