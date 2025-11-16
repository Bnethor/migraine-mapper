# ⚡ Quick Deployment Guide

## 🎯 Quick Steps

### 1. Deploy Backend (Render) - 5 minutes

1. Go to [render.com](https://render.com) and sign up with GitHub
2. Click "New +" → "Blueprint"
3. Connect your GitHub repo
4. Render will auto-detect `migraine-tracker-api/render.yaml`
5. Click "Apply" - it will create both database and API
6. Wait for deployment (~5-10 minutes)
7. Copy your API URL (e.g., `https://migraine-tracker-api.onrender.com`)

### 2. Deploy Frontend (Vercel) - 3 minutes

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "New Project"
3. Import your repo
4. **Set Root Directory**: `migraine-tracker-web`
5. **Add Environment Variable**:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-api.onrender.com/api` (use your actual Render URL)
6. Click "Deploy"
7. Done! 🎉

## 🔗 Connect Them

After both are deployed:
- Your frontend URL: `https://your-app.vercel.app`
- Your backend URL: `https://your-api.onrender.com/api`

Make sure `VITE_API_BASE_URL` in Vercel points to your Render backend URL.

## ⚠️ Important Notes

1. **First Request Delay**: Render free tier spins down after 15 min. First request after inactivity may take 30-60 seconds.

2. **Database**: Render will create a PostgreSQL database automatically. You may need to run your database migrations/schema.

3. **Environment Variables**: 
   - Backend: Set automatically by Render from the database
   - Frontend: You need to set `VITE_API_BASE_URL` manually in Vercel

## 🐛 Troubleshooting

**Backend not responding?**
- Check Render logs
- Verify database is running
- Check environment variables

**Frontend can't connect to API?**
- Verify `VITE_API_BASE_URL` in Vercel settings
- Check browser console for CORS errors
- Make sure backend URL ends with `/api`

**CORS errors?**
- Backend already has CORS enabled
- If issues persist, check Render logs

## 📚 Full Guide

See `DEPLOYMENT.md` for detailed instructions and alternative options.

