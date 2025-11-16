import { Loader2 } from 'lucide-react';

// ============================================
// LOADING COMPONENT
// ============================================

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

/**
 * Reusable Loading Spinner Component
 * Features:
 * - Multiple sizes
 * - Optional loading text
 * - Full-screen option
 * - Accessible with ARIA attributes
 */
export const Loading = ({
  size = 'md',
  text,
  fullScreen = false,
  className = '',
}: LoadingProps) => {
  // Size mapping
  const sizeMap = {
    sm: 20,
    md: 32,
    lg: 48,
    xl: 64,
  };

  const iconSize = sizeMap[size];

  // Container styles
  const containerStyles = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50'
    : 'flex items-center justify-center py-8';

  return (
    <div className={`${containerStyles} ${className}`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <Loader2 
          size={iconSize} 
          className="animate-spin text-primary-600 dark:text-primary-400" 
          aria-hidden="true"
        />
        {text && (
          <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
            {text}
          </p>
        )}
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

/**
 * Skeleton Loading Component for content placeholders
 */
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export const Skeleton = ({
  width = 'w-full',
  height = 'h-4',
  className = '',
  rounded = 'md',
}: SkeletonProps) => {
  const roundedStyles = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${width} ${height} ${roundedStyles[rounded]} ${className}`}
      aria-hidden="true"
    />
  );
};

/**
 * Button Loading Spinner (smaller, inline)
 */
export const ButtonLoading = ({ className = '' }: { className?: string }) => {
  return (
    <Loader2 
      size={16} 
      className={`animate-spin ${className}`} 
      aria-hidden="true"
    />
  );
};

export default Loading;

