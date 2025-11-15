import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isAutoMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>('light');

  const getThemeBasedOnTime = (): Theme => {
    const now = new Date();
    const hour = now.getHours();
    
    // Light mode: 8 AM (8) to 5 PM (17)
    // Dark mode: otherwise
    if (hour >= 8 && hour < 17) {
      return 'light';
    }
    return 'dark';
  };

  const updateTheme = () => {
    const newTheme = getThemeBasedOnTime();
    setTheme(newTheme);
    
    // Update document class
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    // Set initial theme
    updateTheme();

    // Check every minute for time changes
    const interval = setInterval(updateTheme, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isAutoMode: true }}>
      {children}
    </ThemeContext.Provider>
  );
};

