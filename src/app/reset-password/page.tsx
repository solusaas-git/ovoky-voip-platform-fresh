'use client';

import { useState, useEffect, Suspense } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SimpleLoadingScreen } from '@/components/SimpleLoadingScreen';
import { useBranding } from '@/lib/BrandingContext';
import { useBranding as useBrandingHook } from '@/hooks/useBranding';
import { useTranslations } from '@/lib/i18n';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Form validation schema with dynamic error messages
const createFormSchema = (t: (key: string) => string) => z.object({
  password: z.string()
    .min(8, { message: t('auth.resetPassword.validation.passwordMinLength') })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: t('auth.validation.passwordComplexity') }),
  confirmPassword: z.string().min(1, { message: t('auth.resetPassword.validation.confirmPasswordRequired') }),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('auth.resetPassword.validation.passwordsMustMatch'),
  path: ["confirmPassword"],
});

function ResetPasswordForm() {
  // Move all hooks to the top before any conditional logic
  const { isLoading: brandingLoading } = useBranding();
  const { getLogoUrl, company } = useBrandingHook();
  const { t, isLoading: translationsLoading } = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string } | null>(null);
  const [errorContent, setErrorContent] = useState({
    title: '',
    message: '',
    description: ''
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Form definition - moved to top to ensure hooks are called in same order
  const formSchema = createFormSchema(t);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Watch password for strength indicator
  const password = form.watch('password');

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-zA-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    
    // Optional bonus points for additional complexity
    if (password.length >= 12) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;
    
    return Math.min(score, 5); // Cap at 5 for display purposes
  };

  const passwordStrength = getPasswordStrength(password);

  // Verify token on page load
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        setIsVerifying(false);
        setErrorContent({
          title: t('auth.resetPassword.errors.invalidLink.title'),
          message: t('auth.resetPassword.errors.invalidLink.message'),
          description: t('auth.resetPassword.errors.invalidLink.description')
        });
        setShowErrorDialog(true);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
          setUserInfo({ email: data.user.email, name: data.user.name });
        } else {
          setTokenValid(false);
          setErrorContent({
            title: t('auth.resetPassword.errors.expiredToken.title'),
            message: data.message || t('auth.resetPassword.errors.expiredToken.message'),
            description: t('auth.resetPassword.errors.expiredToken.description')
          });
          setShowErrorDialog(true);
        }
      } catch (error) {
        console.error('Token verification error:', error);
        setTokenValid(false);
        setErrorContent({
          title: t('auth.resetPassword.errors.verificationError.title'),
          message: t('auth.resetPassword.errors.verificationError.message'),
          description: t('auth.resetPassword.errors.verificationError.description')
        });
        setShowErrorDialog(true);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token, t]);

  // Show simple loading screen until branding and translations are ready
  if (brandingLoading || translationsLoading) {
    return <SimpleLoadingScreen />;
  }

  const logoUrl = getLogoUrl();
  const logoAltText = company.logoAltText;

  // Form submission handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!token) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          password: values.password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        switch (data.code) {
          case 'MISSING_FIELDS':
            setErrorContent({
              title: t('auth.resetPassword.errors.missingFields.title'),
              message: t('auth.resetPassword.errors.missingFields.message'),
              description: t('auth.resetPassword.errors.missingFields.description')
            });
            break;
          case 'WEAK_PASSWORD':
            setErrorContent({
              title: t('auth.resetPassword.errors.weakPassword.title'),
              message: t('auth.resetPassword.errors.weakPassword.message'),
              description: t('auth.resetPassword.errors.weakPassword.description')
            });
            form.setError('password', {
              type: 'manual',
              message: t('auth.resetPassword.validation.passwordMinLength')
            });
            break;
          case 'RESET_FAILED':
            setErrorContent({
              title: t('auth.resetPassword.errors.resetFailed.title'),
              message: data.message || t('auth.resetPassword.errors.resetFailed.message'),
              description: t('auth.resetPassword.errors.resetFailed.description')
            });
            break;
          default:
            setErrorContent({
              title: t('auth.resetPassword.errors.resetFailed.title'),
              message: data.message || t('auth.resetPassword.errors.resetFailed.message'),
              description: t('auth.resetPassword.errors.resetFailed.description')
            });
            break;
        }
        setShowErrorDialog(true);
      } else {
        // Success
        setShowSuccessDialog(true);
        form.reset();
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setErrorContent({
        title: t('auth.resetPassword.errors.networkError.title'),
        message: t('auth.resetPassword.errors.networkError.message'),
        description: t('auth.resetPassword.errors.networkError.description')
      });
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    router.push('/login');
  };

  const handleErrorClose = () => {
    setShowErrorDialog(false);
    if (!tokenValid) {
      router.push('/forgot-password');
    }
  };

  // Loading state while verifying token
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--brand-primary)]" />
          <p className="text-gray-600 dark:text-gray-400">{t('auth.resetPassword.verifying')}</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid && !showErrorDialog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.resetPassword.errors.invalidTokenState.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('auth.resetPassword.errors.invalidTokenState.message')}
          </p>
          <Link href="/forgot-password">
            <Button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90">
              {t('auth.resetPassword.errors.invalidTokenState.requestNew')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 flex items-center justify-center px-4 py-4 overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md my-auto"
      >
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-40 h-24 sm:w-48 sm:h-32 lg:w-64 lg:h-40 flex items-center justify-center mx-auto mb-2"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoAltText}
                className="w-24 h-16 sm:w-32 sm:h-20 lg:w-40 lg:h-24 object-contain"
              />
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-16 sm:h-16 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]/80 rounded-full">
                <Lock className="w-8 h-8 sm:w-8 sm:h-8 text-white" />
              </div>
            )}
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.resetPassword.title')}</h1>
          {userInfo && (
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {t('auth.resetPassword.greeting', { name: userInfo.name })}
            </p>
          )}
        </div>

        {/* Main Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 sm:p-6 lg:p-8"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[var(--brand-primary)] transition-colors duration-200" />
                        </div>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('auth.resetPassword.passwordPlaceholder')}
                          className="pl-12 pr-12 h-12 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 rounded-xl transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-gray-300 dark:hover:border-gray-500"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-200"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-1">
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded transition-colors duration-200 ${
                                passwordStrength >= level
                                  ? passwordStrength <= 2
                                    ? 'bg-red-400'
                                    : passwordStrength <= 3
                                    ? 'bg-yellow-400' 
                                    : passwordStrength <= 4
                                    ? 'bg-blue-400'
                                    : 'bg-green-400'
                                  : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {passwordStrength <= 2 && t('common.status.weak')} 
                          {passwordStrength === 3 && t('common.status.fair')}
                          {passwordStrength === 4 && t('common.status.good')}
                          {passwordStrength === 5 && t('common.status.strong')}
                        </p>
                      </div>
                    )}
                    
                    <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                  </FormItem>
                )}
              />

              {/* Confirm Password Field */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[var(--brand-primary)] transition-colors duration-200" />
                        </div>
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                          className="pl-12 pr-12 h-12 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 rounded-xl transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-gray-300 dark:hover:border-gray-500"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-200"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading || !tokenValid}
                  className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group transform hover:-translate-y-0.5 border-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      {t('auth.resetPassword.submitting')}
                    </>
                  ) : (
                    <>
                      {t('auth.resetPassword.submitButton')}
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </Form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link 
              href="/login"
              className="text-sm text-[var(--brand-primary)] dark:text-blue-400 hover:text-[var(--brand-primary)]/80 dark:hover:text-blue-300 transition-colors duration-200 font-medium"
            >
              {t('auth.resetPassword.backToLogin')}
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={handleSuccessClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              {t('auth.resetPassword.success.title')}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="font-medium text-gray-900 dark:text-gray-100 block">{t('auth.resetPassword.success.message')}</span>
              <span className="text-gray-600 dark:text-gray-400 block">{t('auth.resetPassword.success.instruction')}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              onClick={handleSuccessClose}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {t('auth.resetPassword.success.goToLogin')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={handleErrorClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {errorContent.title}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="font-medium text-gray-900 dark:text-gray-100 block">{errorContent.message}</span>
              <span className="text-gray-600 dark:text-gray-400 block">{errorContent.description}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              onClick={handleErrorClose}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {tokenValid ? t('common.actions.tryAgain') : t('auth.resetPassword.errors.invalidTokenState.requestNew')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<SimpleLoadingScreen />}>
      <ResetPasswordForm />
    </Suspense>
  );
} 