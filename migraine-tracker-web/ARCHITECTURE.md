# 🏗️ Application Architecture

## 📁 Project Structure

```
migraine-tracker-web/
│
├── 📄 Configuration Files
│   ├── package.json              # Dependencies and scripts
│   ├── tsconfig.json             # TypeScript configuration
│   ├── vite.config.ts            # Vite build configuration
│   ├── tailwind.config.js        # TailwindCSS configuration
│   ├── postcss.config.js         # PostCSS configuration
│   ├── eslint.config.js          # ESLint configuration
│   └── .env                      # Environment variables (create this)
│
├── 📁 public/                    # Static assets
│
├── 📁 src/                       # Source code
│   │
│   ├── 📁 api/                   # API Layer
│   │   ├── apiClient.ts         # Axios instance with interceptors
│   │   ├── authService.ts       # Authentication API calls
│   │   └── migraineService.ts   # Migraine CRUD API calls
│   │
│   ├── 📁 components/
│   │   └── 📁 common/           # Reusable UI Components
│   │       ├── Button.tsx       # Button component
│   │       ├── Input.tsx        # Input field component
│   │       ├── Card.tsx         # Card container component
│   │       ├── Loading.tsx      # Loading spinner component
│   │       ├── ErrorMessage.tsx # Error display component
│   │       ├── Modal.tsx        # Modal dialog component
│   │       ├── Layout.tsx       # App layout with sidebar
│   │       └── index.ts         # Component exports
│   │
│   ├── 📁 features/             # Feature Modules
│   │   │
│   │   ├── 📁 auth/             # Authentication Feature
│   │   │   ├── AuthContext.tsx # Auth state & hooks
│   │   │   ├── LoginPage.tsx   # Login UI
│   │   │   └── ProtectedRoute.tsx # Route guards
│   │   │
│   │   ├── 📁 dashboard/        # Dashboard Feature
│   │   │   ├── DashboardPage.tsx # Dashboard page
│   │   │   ├── MigraineChart.tsx # Chart components
│   │   │   └── RecentEntries.tsx # Recent entries list
│   │   │
│   │   └── 📁 migraine/         # Migraine CRUD Feature
│   │       ├── MigraineFormPage.tsx   # Create/Edit form
│   │       ├── MigraineListPage.tsx   # List all entries
│   │       ├── MigraineDetailPage.tsx # View single entry
│   │       └── MigraineTable.tsx      # Data table
│   │
│   ├── 📁 hooks/                # Custom React Hooks
│   │   └── (future hooks)
│   │
│   ├── 📁 routing/              # Routing Configuration
│   │   └── AppRouter.tsx        # Route definitions
│   │
│   ├── 📁 types/                # TypeScript Types
│   │   └── index.ts            # Type definitions
│   │
│   ├── 📁 utils/                # Utility Functions
│   │   └── (future utilities)
│   │
│   ├── 📄 App.tsx               # Main app component
│   ├── 📄 main.tsx              # Entry point
│   └── 📄 index.css             # Global styles
│
├── 📁 dist/                     # Build output (generated)
│
├── 📄 README.md                 # Main documentation
├── 📄 SETUP.md                  # Setup guide
├── 📄 PROJECT_SUMMARY.md        # Project summary
└── 📄 ARCHITECTURE.md           # This file
```

## 🔄 Data Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    React    │ ◄─── React Router (Navigation)
│   App.tsx   │ ◄─── React Query (Data Fetching)
└──────┬──────┘
       │
       ├──► AuthContext ──► Login/Logout State
       │
       ├──► Protected Routes ──► Route Guards
       │
       ├──► Features
       │    ├── Dashboard
       │    ├── Migraine CRUD
       │    └── Auth
       │
       └──► Components
            └── Common UI Components
                 │
                 ▼
            ┌──────────────┐
            │ API Services │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │  API Client  │ (Axios + Interceptors)
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │  MCP Agent   │ (Your Backend API)
            │     API      │
            └──────────────┘
```

## 🔐 Authentication Flow

```
1. User enters credentials
   └─► LoginPage.tsx
       │
       ├─► Form Validation (React Hook Form + Zod)
       │
       └─► authService.login()
           │
           ├─► POST /api/auth/login
           │
           └─► Store JWT token in localStorage
               │
               └─► Update AuthContext
                   │
                   └─► Navigate to Dashboard
                       │
                       └─► All requests now include token
```

## 🔒 Route Protection

```
Public Routes (No Auth Required):
├── /login ──► LoginPage

Protected Routes (Auth Required):
├── / ──► Redirect to /dashboard
├── /dashboard ──► DashboardPage
├── /migraines ──► MigraineListPage
├── /migraines/new ──► MigraineFormPage
├── /migraines/:id ──► MigraineDetailPage
└── /migraines/:id/edit ──► MigraineFormPage
```

## 📦 State Management

### Global State:
- **Authentication**: `AuthContext` (React Context API)
  - User data
  - Login/logout methods
  - Auth status

### Server State:
- **React Query** (TanStack Query)
  - API data caching
  - Automatic refetching
  - Loading states
  - Error handling
  - Query invalidation

### Form State:
- **React Hook Form**
  - Form values
  - Validation
  - Error states
  - Submit handling

### Local State:
- **useState** for component-specific state
  - UI toggles
  - Modal visibility
  - Search filters

## 🔌 API Integration

### API Client (`apiClient.ts`)
```typescript
Axios Instance
├── Base URL: From .env
├── Timeout: 30 seconds
├── Headers: Content-Type: application/json
│
├── Request Interceptor:
│   └── Adds Authorization header with JWT token
│
└── Response Interceptor:
    ├── Logs API calls (dev mode)
    ├── Handles 401: Logout & redirect
    ├── Handles 403: Log access denied
    └── Handles 500+: Log server error
```

### Service Layer
```
authService.ts
├── login(credentials)
├── register(credentials)
├── logout()
├── getCurrentUser()
├── refreshToken()
└── isAuthenticated()

migraineService.ts
├── getAll(pagination)
├── getById(id)
├── create(data)
├── update(id, data)
├── delete(id)
├── getStatistics()
├── getRecent(limit)
├── search(params)
└── export(format)
```

## 🎨 Component Architecture

### Component Hierarchy:
```
App
├── BrowserRouter
│   └── AuthProvider
│       └── QueryClientProvider
│           └── AppRouter
│               ├── Public Routes
│               │   └── LoginPage
│               │
│               └── Protected Routes
│                   └── Layout
│                       ├── Sidebar Navigation
│                       ├── User Profile
│                       │
│                       └── Page Content
│                           ├── DashboardPage
│                           │   ├── Stats Cards
│                           │   ├── Charts
│                           │   └── Recent Entries
│                           │
│                           ├── MigraineListPage
│                           │   ├── Search Bar
│                           │   ├── Table
│                           │   └── Pagination
│                           │
│                           ├── MigraineFormPage
│                           │   └── Form Fields
│                           │
│                           └── MigraineDetailPage
│                               └── Entry Details
```

### Reusable Components:
```
Common Components (Stateless, Reusable)
├── Button      ─► 5 variants, 3 sizes, loading state
├── Input       ─► Labels, icons, validation
├── Card        ─► Flexible container
├── Loading     ─► Spinners & skeletons
├── Error       ─► Error messages & empty states
├── Modal       ─► Dialogs & confirmations
└── Layout      ─► App shell with navigation
```

## 🎯 Design Patterns

### 1. **Feature-Based Organization**
```
Each feature is self-contained:
/features/auth/
  ├── Components (UI)
  ├── Context (State)
  └── Types (if feature-specific)
```

### 2. **Separation of Concerns**
```
Layers:
├── UI Layer       ─► React Components
├── Logic Layer    ─► Hooks & Context
├── API Layer      ─► Services
└── Type Layer     ─► TypeScript types
```

### 3. **Composition Over Inheritance**
```
<Card>
  <CardHeader>
    <CardTitle>...</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

### 4. **Container/Presenter Pattern**
```
Container (Smart):
  ├── Fetches data
  ├── Manages state
  └── Handles logic

Presenter (Dumb):
  ├── Receives props
  ├── Displays UI
  └── Emits events
```

## 🔧 Configuration Files

### Environment Variables (`.env`)
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### TypeScript (`tsconfig.json`)
- Strict mode enabled
- Path aliases configured
- Module resolution: bundler

### TailwindCSS (`tailwind.config.js`)
- Custom color palette
- Content paths configured
- Plugins ready

### Vite (`vite.config.ts`)
- React plugin
- Build optimizations
- Path resolution

## 📊 Data Models

### User
```typescript
{
  id: string
  email: string
  name: string
  createdAt: string
}
```

### Migraine Entry
```typescript
{
  id: string
  userId: string
  date: string
  startTime: string
  endTime?: string
  intensity: 1 | 2 | 3 | 4 | 5
  triggers?: string[]
  symptoms?: string[]
  medication?: string
  notes?: string
  location?: PainLocation
  createdAt: string
  updatedAt: string
}
```

### Statistics
```typescript
{
  totalEntries: number
  averageIntensity: number
  mostCommonTriggers: { trigger: string; count: number }[]
  frequencyByMonth: { month: string; count: number }[]
  intensityTrend: { date: string; intensity: number }[]
}
```

## 🚀 Build Process

```
Development:
npm run dev
  └── Vite Dev Server
      ├── Hot Module Replacement
      ├── Fast Refresh
      └── Source Maps

Production:
npm run build
  └── TypeScript Check
      └── Vite Build
          ├── Bundle & Minify
          ├── Code Splitting
          ├── Asset Optimization
          └── Output to dist/
```

## 🎨 Styling Architecture

### TailwindCSS Utility-First:
```
Base Layer (@tailwind base)
  ├── CSS Reset
  └── Base styles

Components Layer (@tailwind components)
  └── Custom component classes

Utilities Layer (@tailwind utilities)
  └── Tailwind utility classes
```

### Custom Theme:
```
Primary Colors: Blue (50-900)
Gray Scale: Gray (50-900)
Semantic Colors:
  ├── Success: Green
  ├── Error: Red
  ├── Warning: Yellow
  └── Info: Blue
```

## 🔍 Error Handling

```
API Error
  │
  ├─► Interceptor catches
  │   ├─► 401: Auto logout
  │   ├─► 403: Log warning
  │   └─► 500: Log error
  │
  └─► React Query
      └─► error state
          └─► ErrorMessage Component
              └─► User sees friendly message
```

## 📈 Performance Optimizations

- ✅ React Query caching
- ✅ Code splitting ready
- ✅ Lazy loading ready
- ✅ Optimized re-renders
- ✅ Production build minification
- ✅ Asset optimization

## 🧪 Quality Assurance

### Type Safety:
- TypeScript strict mode
- Full type coverage
- No `any` types

### Code Quality:
- ESLint configured
- Consistent formatting
- Comprehensive comments

### User Experience:
- Loading states
- Error handling
- Empty states
- Accessibility

---

**This architecture ensures scalability, maintainability, and excellent developer experience.**

