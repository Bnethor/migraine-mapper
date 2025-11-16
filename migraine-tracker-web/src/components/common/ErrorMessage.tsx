import { AlertCircle, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

// ============================================
// ERROR MESSAGE COMPONENT
// ============================================

interface ErrorMessageProps {
  title?: string;
  message: string | ReactNode;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'inline' | 'banner' | 'card';
}

/**
 * Reusable Error Message Component
 * Features:
 * - Multiple display variants
 * - Optional retry action
 * - Dismissible
 * - Accessible with ARIA attributes
 */
export const ErrorMessage = ({
  title = 'Error',
  message,
  onRetry,
  onDismiss,
  className = '',
  variant = 'card',
}: ErrorMessageProps) => {
  // Variant styles
  const variantStyles = {
    inline: 'text-sm text-red-600 dark:text-red-400 flex items-start gap-2',
    banner: 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 p-4',
    card: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6',
  };

  if (variant === 'inline') {
    return (
      <div className={`${variantStyles.inline} ${className}`} role="alert">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className={`${variantStyles[variant]} ${className}`} role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <XCircle className="text-red-500 dark:text-red-400" size={24} />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
            {title}
          </h3>
          <div className="text-sm text-red-700 dark:text-red-400">
            {message}
          </div>

          {/* Actions */}
          {(onRetry || onDismiss) && (
            <div className="flex gap-3 mt-4">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm font-medium text-red-800 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200 underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {/* Close button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
            aria-label="Dismiss error"
          >
            <XCircle size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Empty State Component
 * For displaying when no data is available
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) => {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {icon && (
        <div className="flex justify-center mb-4 text-gray-400 dark:text-gray-400">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;

