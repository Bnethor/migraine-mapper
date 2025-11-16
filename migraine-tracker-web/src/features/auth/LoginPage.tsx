import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Brain } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button, Input, Card, ErrorMessage } from '../../components/common';
import type { LoginCredentials } from '../../types';

// ============================================
// LOGIN PAGE
// ============================================

/**
 * Login form validation schema using Zod
 */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login Page Component
 * Features:
 * - Form validation with React Hook Form + Zod
 * - Error handling and display
 * - Loading states
 * - Accessible form elements
 * - Modern, responsive design
 */
export const LoginPage = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data as LoginCredentials);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-purple-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Brain size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Migraine Mapper
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to track and manage your migraines
          </p>
        </div>

        {/* Login Card */}
        <Card padding="lg" shadow="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error Message */}
            {error && (
              <ErrorMessage
                variant="banner"
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            {/* Email Field */}
            <Input
              {...register('email')}
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              error={errors.email?.message}
              leftIcon={<Mail size={20} />}
              disabled={isLoading}
              autoComplete="email"
              required
            />

            {/* Password Field */}
            <Input
              {...register('password')}
              type="password"
              label="Password"
              placeholder="Enter your password"
              error={errors.password?.message}
              leftIcon={<Lock size={20} />}
              disabled={isLoading}
              autoComplete="current-password"
              required
            />

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <a
                href="#"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium focus:outline-none focus:underline"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Password reset feature coming soon!');
                }}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
            >
              Sign In
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 dark:text-gray-400">
                  Don't have an account?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              fullWidth
              onClick={() => alert('Registration feature coming soon!')}
              disabled={isLoading}
            >
              Create Account
            </Button>
          </form>
        </Card>

        {/* Demo Credentials Info */}
        <Card padding="md" shadow="sm" className="mt-4 bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 font-medium mb-2">
            🔑 Demo Credentials
          </p>
          <p className="text-xs text-blue-700">
            Email: <span className="font-mono">demo@example.com</span>
            <br />
            Password: <span className="font-mono">demo123</span>
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Note: Update these with your actual MCP API credentials
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

