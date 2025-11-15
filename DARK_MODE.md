# Dark Mode Implementation

## 📅 Time-Based Automatic Theme Switching

The application automatically switches between light and dark mode based on the current time:

### Schedule
- **Light Mode**: 8:00 AM - 5:00 PM (08:00 - 17:00)
- **Dark Mode**: 5:00 PM - 8:00 AM (17:00 - 08:00)

### Features
1. **Automatic Detection**: Theme changes automatically based on system clock
2. **Real-time Updates**: Checks every minute for theme changes
3. **Smooth Transitions**: 200ms transition animations for all color changes
4. **Full Coverage**: All components support both themes

## 🎨 Implementation Details

### Files Modified

#### 1. Theme Context (`src/contexts/ThemeContext.tsx`)
- Created theme provider with automatic time-based switching
- Updates document class (`dark` class on `<html>`)
- Checks time every 60 seconds for updates

#### 2. Tailwind Configuration (`tailwind.config.js`)
- Added `darkMode: 'class'` for class-based dark mode
- Enables `dark:` variant modifiers

#### 3. Global Styles (`src/index.css`)
- Added dark mode background and text colors
- Smooth transition animations for theme changes

#### 4. Components Updated
- **Card**: Dark backgrounds, borders, and text colors
- **Button**: All variants support dark mode
- **Layout**: Sidebar, navigation, headers support dark mode
- **Typography**: All text elements have dark mode variants

### Color Scheme

**Light Mode:**
- Background: gray-50
- Cards: white
- Text: gray-900
- Borders: gray-200

**Dark Mode:**
- Background: gray-900
- Cards: gray-800
- Text: gray-100
- Borders: gray-700

## 🚀 Testing

To test the dark mode:

1. **Manual Testing**: Change your system time to before 8 AM or after 5 PM
2. **Automatic**: Wait for the scheduled time change
3. **Development**: Modify the time check in `ThemeContext.tsx`:

```typescript
// Current logic:
if (hour >= 8 && hour < 17) {
  return 'light';
}

// For testing, temporarily change to:
if (hour >= 0 && hour < 24) {  // Always light
  return 'light';
}
// or
if (false) {  // Always dark
  return 'light';
}
```

## 📝 Notes

- Theme updates automatically without page refresh
- No user settings needed - fully automatic
- All new components should include `dark:` variants
- Uses Tailwind's built-in dark mode support

## 🔄 Future Enhancements

Possible additions:
- Manual theme toggle override
- Custom time range settings
- System preference detection fallback
- Theme persistence in localStorage

