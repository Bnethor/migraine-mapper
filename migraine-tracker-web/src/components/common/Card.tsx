import type { HTMLAttributes, ReactNode } from 'react';

// ============================================
// CARD COMPONENT
// ============================================

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Reusable Card Component
 * Features:
 * - Customizable padding and shadow
 * - Hover effects
 * - Clean, modern design
 */
export const Card = ({
  children,
  padding = 'md',
  hover = false,
  shadow = 'md',
  className = '',
  ...props
}: CardProps) => {
  // Padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  // Shadow styles
  const shadowStyles = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  // Hover effect
  const hoverStyles = hover ? 'hover:shadow-xl transition-shadow duration-300' : '';

  // Combine styles
  const combinedStyles = `bg-white rounded-lg ${paddingStyles[padding]} ${shadowStyles[shadow]} ${hoverStyles} ${className}`;

  return (
    <div className={combinedStyles} {...props}>
      {children}
    </div>
  );
};

/**
 * Card Header Component
 */
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader = ({ children, className = '' }: CardHeaderProps) => {
  return (
    <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Card Title Component
 */
interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export const CardTitle = ({ children, className = '' }: CardTitleProps) => {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
};

/**
 * Card Description Component
 */
interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export const CardDescription = ({ children, className = '' }: CardDescriptionProps) => {
  return (
    <p className={`text-sm text-gray-600 mt-1 ${className}`}>
      {children}
    </p>
  );
};

/**
 * Card Footer Component
 */
interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter = ({ children, className = '' }: CardFooterProps) => {
  return (
    <div className={`border-t border-gray-200 pt-4 mt-4 ${className}`}>
      {children}
    </div>
  );
};

export default Card;

