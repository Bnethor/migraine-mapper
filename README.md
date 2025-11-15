# Migraine Tracker

A full-stack application for tracking and managing migraine episodes with AI-powered insights.

## 🚀 Quick Start

### Start Both Backend & Frontend

```bash
./start.sh
```

This will:
- Start the backend API server on `http://localhost:3000`
- Start the frontend dev server on `http://localhost:5173`
- Automatically handle cleanup when you press `Ctrl+C`

### Stop All Servers

```bash
./stop.sh
```

Or simply press `Ctrl+C` if using the start script.

## 📦 Manual Setup

If you prefer to run them separately:

### Backend Setup

```bash
cd migraine-tracker-api
npm install
npm start
```

### Frontend Setup

```bash
cd migraine-tracker-web
npm install
npm run dev
```

## 🔑 Demo Credentials

```
Email:    demo@example.com
Password: demo123
```

## 📁 Project Structure

```
Junction2025/
├── migraine-tracker-api/     # Backend API (Express.js)
│   ├── server.js             # Main server file
│   └── package.json
├── migraine-tracker-web/     # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/              # API services
│   │   ├── components/       # Reusable components
│   │   ├── features/         # Feature modules
│   │   └── routing/          # App routing
│   └── package.json
├── start.sh                  # Start both servers
└── stop.sh                   # Stop all servers
```

## 🛠️ Technology Stack

### Backend
- **Node.js** + **Express.js** - REST API
- **JWT** - Authentication
- In-memory storage (can be replaced with a database)

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **React Query** - Data fetching & caching
- **React Hook Form** + **Zod** - Form handling & validation

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Migraine Entries
- `GET /api/migraine` - Get all entries (paginated)
- `GET /api/migraine/:id` - Get single entry
- `POST /api/migraine` - Create new entry
- `PUT /api/migraine/:id` - Update entry
- `DELETE /api/migraine/:id` - Delete entry
- `GET /api/migraine/statistics` - Get dashboard statistics
- `GET /api/migraine/recent` - Get recent entries

## 🔧 Development

### Backend Dev
```bash
cd migraine-tracker-api
npm run dev  # With nodemon for auto-reload
```

### Frontend Dev
```bash
cd migraine-tracker-web
npm run dev  # Vite dev server with HMR
```

### Build for Production
```bash
cd migraine-tracker-web
npm run build
npm run preview  # Preview production build
```

## 📝 Features

- ✅ User authentication (login/register)
- ✅ Dashboard with statistics
- ✅ Create, read, update, delete migraine entries
- ✅ Track intensity, triggers, symptoms, medications
- ✅ Visual charts and analytics
- ✅ Responsive design
- ✅ Form validation
- ✅ Protected routes
- ✅ JWT token management

## 🐛 Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
./stop.sh  # Kill all processes
./start.sh # Restart
```

Or manually:
```bash
# Kill port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Backend Won't Start

Check logs:
```bash
tail -f /tmp/migraine-backend.log
```

### Frontend Won't Start

Check logs:
```bash
tail -f /tmp/migraine-frontend.log
```

## 📄 License

MIT License - Junction 2025 Hackathon Project

