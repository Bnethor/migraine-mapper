# 🚀 Quick Start: Deploy to Render

This is a simplified guide to get your app deployed on Render quickly.

## ⚡ Fastest Method (Using render.yaml)

1. **Push your code to GitHub** (if not already done)

2. **Go to Render Dashboard** → [New Blueprint](https://dashboard.render.com/new/blueprint)

3. **Connect your repository** and select the branch

4. **Render will automatically:**
   - Create PostgreSQL database
   - Deploy backend API
   - Deploy frontend static site
   - Link database to backend

5. **After deployment completes:**
   
   a. **Initialize the database:**
      - Go to your `migraine-tracker-api` service
      - Click **Shell** tab
      - Run: `npm run init-db`
   
   b. **Update frontend API URL:**
      - Go to your `migraine-tracker-web` service
      - Go to **Environment** tab
      - Set `VITE_API_BASE_URL` to: `https://migraine-tracker-api.onrender.com/api`
      - Click **Save Changes** and **Manual Deploy** → **Deploy latest commit**

6. **Done!** Visit your frontend URL

## 📝 Environment Variables

### Backend (Auto-configured by render.yaml)
- ✅ All database variables are auto-set
- ✅ JWT_SECRET is auto-generated
- ✅ PORT is set to 10000

### Frontend (You need to set this)
```
VITE_API_BASE_URL=https://migraine-tracker-api.onrender.com/api
```
Replace `migraine-tracker-api` with your actual backend service name.

## 🔧 Manual Database Initialization

If the automatic init doesn't work, you can run migrations manually:

1. Get your database connection string from Render dashboard
2. Use any PostgreSQL client (psql, DBeaver, etc.)
3. Connect and run the SQL files from `migraine-tracker-api/db/` in order

Or use Render's Shell:
```bash
# In backend service Shell
npm run init-db
```

## ⚠️ Important Notes

- **Free tier spins down** after 15 min inactivity (first request takes ~30s)
- **Database is free for 90 days**, then $7/month
- **Frontend is always free** and always on
- **Backend URL changes** - make sure to update frontend env var

## 🆘 Troubleshooting

**Backend won't start?**
- Check logs in Render dashboard
- Verify database is running
- Check all env vars are set

**Frontend can't connect?**
- Verify `VITE_API_BASE_URL` is correct
- Make sure backend is awake (visit backend URL first)
- Check CORS settings

**Database errors?**
- Run `npm run init-db` in backend Shell
- Check database connection string
- Verify database is running

## 🎯 Next Steps

1. Set up custom domain (optional)
2. Enable auto-deploy from Git (default)
3. Consider upgrading to paid plan for always-on backend

