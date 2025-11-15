# 🚀 Quick Setup Guide

## Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Your MCP Agent API endpoint

## Installation Steps

### 1. Install Dependencies
```bash
cd /home/sakkekood/Hackathons/Junction2025/migraine-tracker-web
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**Important:** Replace `http://localhost:3000/api` with your actual MCP agent API endpoint.

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at: `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

### 5. Preview Production Build
```bash
npm run preview
```

## 🔧 Troubleshooting

### API Connection Issues
1. Verify your `.env` file has the correct API URL
2. Check that your API is running and accessible
3. Open browser DevTools (F12) and check the Network tab for API calls
4. Verify CORS is enabled on your API

### Port Already in Use
If port 5173 is already in use, Vite will automatically use the next available port.
Check the terminal output for the actual URL.

### Build Errors
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear Vite cache:
   ```bash
   rm -rf dist
   npm run build
   ```

## 📝 API Requirements

Your MCP agent API should implement the following endpoints:

### Authentication
- `POST /api/auth/login` - Login with { email, password }
- `POST /api/auth/register` - Register with { name, email, password }
- `GET /api/auth/me` - Get current user (requires auth token)
- `POST /api/auth/logout` - Logout

### Migraine Entries
- `GET /api/migraine` - List all entries (supports ?page=1&limit=10)
- `GET /api/migraine/:id` - Get single entry
- `POST /api/migraine` - Create entry
- `PUT /api/migraine/:id` - Update entry
- `DELETE /api/migraine/:id` - Delete entry
- `GET /api/migraine/statistics` - Get dashboard statistics
- `GET /api/migraine/recent?limit=5` - Get recent entries

### Expected Response Format
```json
{
  "data": { ... },
  "success": true,
  "message": "Optional message"
}
```

### Authentication
The app expects JWT tokens. The API should return:
```json
{
  "data": {
    "user": { "id": "...", "email": "...", "name": "..." },
    "token": "jwt_token_here"
  },
  "success": true
}
```

## 🎨 Customization

### Change Theme Colors
Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your colors here
      },
    },
  },
}
```

### Change Default Pagination
Edit `src/api/migraineService.ts` line 32:
```typescript
limit: params?.limit?.toString() || '10', // Change to your preferred default
```

### Change Port
Edit `vite.config.ts` and add:
```typescript
server: {
  port: 3001, // Your preferred port
}
```

## 📱 Browser Compatibility
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🆘 Getting Help

### Check the logs
1. Browser Console (F12 → Console)
2. Terminal output where dev server is running
3. Network tab (F12 → Network) for API calls

### Common Issues

**"Network Error"**
- API is not running or URL is incorrect
- CORS not configured on API
- Check `.env` file

**"401 Unauthorized"**
- Token expired or invalid
- Try logging out and logging in again
- Check that API `/auth/me` endpoint works

**"Module not found"**
- Run `npm install`
- Clear cache and rebuild

## 🎯 Next Steps

1. **Configure your API endpoint** in `.env`
2. **Test the login** with your API credentials
3. **Create a test migraine entry**
4. **Check the dashboard** to see your data visualized

## 📞 Support

For detailed information, check `README.md`

---

**Happy Coding! 🚀**

