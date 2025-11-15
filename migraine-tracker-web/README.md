# 🧠 Migraine Tracker Dashboard

A modern, full-featured React web application for tracking and analyzing migraine patterns. Built with React, TypeScript, TailwindCSS, and industry best practices.

## ✨ Features

### 🔐 **Authentication System**
- Secure login/logout functionality
- Protected routes with automatic redirection
- Token-based authentication with localStorage
- Auth context for global state management
- Form validation with Zod

### 📊 **Interactive Dashboard**
- Real-time statistics (total entries, average intensity, top triggers)
- Interactive charts using Recharts:
  - Intensity trend line chart
  - Monthly frequency bar chart
- Recent entries preview with quick actions
- Responsive card-based layout

### 📝 **Complete CRUD Operations**
- **Create**: Add new migraine entries with detailed information
- **Read**: View all entries in a paginated table or individual details
- **Update**: Edit existing entries with pre-populated forms
- **Delete**: Remove entries with confirmation dialogs

### 🎯 **Migraine Entry Features**
- Date and time tracking (start/end time)
- Pain intensity scale (1-5)
- Pain location selection
- Trigger tracking (comma-separated)
- Symptom logging
- Medication tracking
- Additional notes
- Automatic timestamps

### 🎨 **UI/UX Excellence**
- Modern, clean design with TailwindCSS
- Fully responsive (mobile-first approach)
- Accessible components (ARIA attributes, keyboard navigation)
- Loading states and skeletons
- Error handling with user-friendly messages
- Empty states with actionable CTAs
- Smooth animations and transitions
- Dark mode ready (easy to extend)

### 🧩 **Reusable Components**
- Button (multiple variants and sizes)
- Input (with icons, labels, error states)
- Card (flexible padding and shadow options)
- Modal & ConfirmDialog
- Loading spinners
- Error messages
- Empty states
- Layout with responsive sidebar

## 🏗️ Architecture

### **Folder Structure**
```
src/
├── api/                      # API layer
│   ├── apiClient.ts         # Axios configuration with interceptors
│   ├── authService.ts       # Authentication API calls
│   └── migraineService.ts   # Migraine CRUD operations
├── components/
│   └── common/              # Reusable UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       ├── Loading.tsx
│       ├── ErrorMessage.tsx
│       ├── Modal.tsx
│       └── Layout.tsx
├── features/                # Feature-based modules
│   ├── auth/
│   │   ├── AuthContext.tsx  # Auth state management
│   │   ├── LoginPage.tsx    # Login UI
│   │   └── ProtectedRoute.tsx
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   ├── MigraineChart.tsx
│   │   └── RecentEntries.tsx
│   └── migraine/
│       ├── MigraineFormPage.tsx
│       ├── MigraineListPage.tsx
│       ├── MigraineDetailPage.tsx
│       └── MigraineTable.tsx
├── routing/
│   └── AppRouter.tsx        # Route definitions
├── types/
│   └── index.ts            # TypeScript type definitions
├── utils/                  # Utility functions
├── App.tsx                 # Main app with providers
└── main.tsx               # Entry point
```

### **Tech Stack**
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **React Query (TanStack Query)** - Data fetching and caching
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Axios** - HTTP client
- **TailwindCSS** - Styling
- **Recharts** - Charts and visualizations
- **date-fns** - Date formatting
- **Lucide React** - Icon library

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v18 or higher)
- npm or yarn
- Your MCP Agent API endpoint

### **Installation**

1. **Clone the repository**
```bash
cd /home/sakkekood/Hackathons/Junction2025/migraine-tracker-web
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the root directory:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```
Replace with your actual MCP agent API endpoint.

4. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### **Build for Production**
```bash
npm run build
```

### **Preview Production Build**
```bash
npm run preview
```

## 🔌 API Integration

The application is designed to work with your custom MCP agent API. The API client expects the following endpoints:

### **Authentication Endpoints**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### **Migraine Endpoints**
- `GET /api/migraine` - Get all entries (with pagination)
- `GET /api/migraine/:id` - Get single entry
- `POST /api/migraine` - Create new entry
- `PUT /api/migraine/:id` - Update entry
- `DELETE /api/migraine/:id` - Delete entry
- `GET /api/migraine/statistics` - Get dashboard statistics
- `GET /api/migraine/recent` - Get recent entries

### **Expected API Response Format**
```typescript
{
  data: T,           // The actual data
  success: boolean,  // Success indicator
  message?: string   // Optional message
}
```

### **Authentication Token**
The API client automatically:
- Stores JWT tokens in localStorage
- Adds `Authorization: Bearer <token>` header to all requests
- Redirects to login on 401 responses
- Handles token refresh

## 🎯 Key Features Explained

### **State Management**
- **React Context** for authentication state
- **React Query** for server state (automatic caching, refetching)
- **React Hook Form** for form state

### **Error Handling**
- API-level error interceptors
- User-friendly error messages
- Retry mechanisms
- Network error detection

### **Accessibility**
- Semantic HTML
- ARIA attributes
- Keyboard navigation
- Focus management
- Screen reader friendly

### **Performance**
- Code splitting with React Router
- Lazy loading
- Optimized re-renders
- Query caching with React Query
- Debounced search

### **Type Safety**
- Full TypeScript coverage
- Zod schema validation
- Type-safe API calls
- Strict mode enabled

## 🎨 Customization

### **Theme Colors**
Customize colors in `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom colors
      },
    },
  },
}
```

### **API Base URL**
Update in `.env`:
```env
VITE_API_BASE_URL=https://your-api.com/api
```

### **Default Pagination**
Modify in service files:
```typescript
// src/api/migraineService.ts
limit: params?.limit?.toString() || '10', // Change default here
```

## 📱 Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🔒 Security Best Practices
- ✅ Token stored in localStorage (HttpOnly cookies recommended for production)
- ✅ Protected routes with authentication checks
- ✅ CSRF protection ready
- ✅ Input validation on client and server
- ✅ XSS protection through React

## 🧪 Testing (To Be Added)
Future enhancements:
- Unit tests with Vitest
- Integration tests with React Testing Library
- E2E tests with Playwright

## 📦 Build Output
Production build creates optimized files in the `dist/` directory:
- Minified JavaScript
- Optimized CSS
- Asset optimization
- Code splitting

## 🤝 Contributing
This is a hackathon project. Feel free to:
- Report issues
- Suggest features
- Submit pull requests

## 📄 License
MIT License - feel free to use this project for your needs.

## 👨‍💻 Developer Notes

### **Mock Data During Development**
If your API is not ready, you can add mock data in the service files:
```typescript
// Temporary mock response
if (import.meta.env.DEV) {
  return mockData;
}
```

### **Environment Variables**
All environment variables must be prefixed with `VITE_` to be accessible in the client.

### **Port Configuration**
Change dev server port in `vite.config.ts`:
```typescript
server: {
  port: 3001,
}
```

## 🎓 Learning Resources
This project demonstrates:
- Modern React patterns (Hooks, Context, Custom Hooks)
- TypeScript best practices
- RESTful API integration
- Form handling and validation
- State management strategies
- Component composition
- Responsive design
- Accessibility standards

## 📞 Support
For issues or questions:
1. Check the API connection in browser DevTools
2. Verify environment variables are set correctly
3. Check console for error messages
4. Review API endpoint documentation

## 🎉 Acknowledgments
Built with modern tools and best practices for Junction 2025 Hackathon.

---

**Happy Tracking! 🧠💙**
