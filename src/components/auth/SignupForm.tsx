'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { EmailVerificationForm } from '@/components/auth/EmailVerificationForm';
import { useBranding } from '@/lib/BrandingContext';
import { useAuth } from '@/lib/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslations } from '@/lib/i18n';

// Form validation schema with dynamic error messages
const createFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, { message: t('auth.validation.nameMin') }),
  email: z.string().email({ message: t('auth.validation.emailInvalid') }),
  password: z.string()
    .min(8, { message: t('auth.validation.passwordMin') })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, {
      message: t('auth.errors.passwordTooWeak')
    }),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: t('auth.validation.agreementRequired')
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('auth.validation.passwordMatch'),
  path: ["confirmPassword"],
});

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    email: string;
    name: string;
    password: string;
  } | null>(null);
  const [modalShake, setModalShake] = useState(false);
  
  const router = useRouter();
  const { settings, isLoading: brandingLoading } = useBranding();
  const companyName = brandingLoading ? 'OVOKY' : (settings.companyName || 'OVOKY');
  const { login } = useAuth();
  const { t } = useTranslations();

  // Form definition with dynamic schema
  const formSchema = createFormSchema(t);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
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

  // Form submission handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('auth.errors.serverError'));
      }

      if (data.requiresVerification) {
        // Show email verification modal
        setVerificationData({
          email: values.email,
          name: values.name,
          password: values.password
        });
        setShowVerificationModal(true);
        toast.success(t('auth.register.checkEmail'));
      } else {
        // Registration successful without verification (fallback)
        try {
          toast.success(t('auth.register.success'));
          await login(values.email, values.password);
          // User will be redirected automatically by the AuthContext
        } catch {
          toast.error(t('auth.errors.serverError'));
          router.push('/login');
        }
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.errors.serverError');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleVerificationSuccess = async () => {
    setShowVerificationModal(false);
    
    if (verificationData) {
      try {
        toast.success(t('auth.verification.success'));
        // Automatically log the user in
        await login(verificationData.email, verificationData.password);
        // User will be redirected automatically by the AuthContext
      } catch {
        toast.error(t('auth.errors.serverError'));
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  };

  const handleBackToRegister = () => {
    setShowVerificationModal(false);
    setVerificationData(null);
  };

  // Function to trigger shake animation when trying to close modal
  const triggerModalShake = () => {
    setModalShake(true);
    setTimeout(() => setModalShake(false), 500); // Reset after animation
  };

  // Function to handle Google sign-up
  const handleGoogleSignUp = async () => {
    try {
      // Use NextAuth signIn with redirect: true to go directly to Google
      await signIn('google', { 
        callbackUrl: '/dashboard',
        redirect: true
      });
    } catch (error) {
      console.error('Google sign-up error:', error);
      toast.error('Google sign-up failed');
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <User className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                    </div>
                    <Input
                      type="text"
                      placeholder={t('auth.register.namePlaceholder')}
                      className="pl-12 h-12 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 rounded-xl transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
              </FormItem>
            )}
          />

          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                    </div>
                    <Input
                      type="email"
                      placeholder={t('auth.register.emailPlaceholder')}
                      className="pl-12 h-12 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 rounded-xl transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.register.passwordPlaceholder')}
                      className="pl-12 pr-12 h-12 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 rounded-xl transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </FormControl>
                
                {/* Compact Password Strength Indicator */}
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
                      <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                    </div>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('auth.register.confirmPasswordPlaceholder')}
                      className="pl-12 pr-12 h-12 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 rounded-xl transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
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

          {/* Terms and Conditions */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-1"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('auth.register.termsPrefix')}{' '}
                    <Link 
                      href="/terms" 
                      className="text-[var(--brand-primary)] dark:text-blue-400 hover:text-[var(--brand-primary)]/80 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                    >
                      {t('auth.register.termsLink')}
                    </Link>{' '}
                    {t('auth.register.termsConnector')}{' '}
                    <Link 
                      href="/privacy" 
                      className="text-[var(--brand-primary)] dark:text-blue-400 hover:text-[var(--brand-primary)]/80 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                    >
                      {t('auth.register.privacyLink')}
                    </Link>
                  </p>
                  <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                </div>
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
              disabled={isLoading}
              className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group transform hover:-translate-y-0.5 border-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t('auth.register.submitting')}
                </>
              ) : (
                <>
                  {t('auth.register.submitButton')}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-4 text-gray-500 dark:text-gray-400 font-medium">
                {t('common.responses.or')}
              </span>
            </div>
          </div>

          {/* Social Login */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={handleGoogleSignUp}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t('auth.register.googleButton')}
            </Button>
          </motion.div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.register.hasAccount')}{' '}
              <Link 
                href="/login" 
                className="text-[var(--brand-primary)] dark:text-blue-400 hover:text-[var(--brand-primary)]/80 dark:hover:text-blue-300 font-semibold transition-colors duration-200"
              >
                {t('auth.register.signIn')}
              </Link>
            </p>
          </div>
        </form>
      </Form>

      {/* Email Verification Modal */}
      <Dialog open={showVerificationModal} onOpenChange={(open) => {
        // Only allow closing if explicitly called
        if (!open) {
          triggerModalShake();
          return;
        }
        handleBackToRegister();
      }}>
        <DialogContent 
          className="sm:max-w-md"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            triggerModalShake();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            triggerModalShake();
          }}
        >
          <motion.div
            animate={modalShake ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <DialogHeader>
              <DialogTitle>{t('auth.verification.title')}</DialogTitle>
              <DialogDescription>
                {t('auth.verification.instruction')}
              </DialogDescription>
            </DialogHeader>
            
            {verificationData && (
              <EmailVerificationForm
                email={verificationData.email}
                name={verificationData.name}
                onVerificationSuccess={handleVerificationSuccess}
                onBackToRegister={handleBackToRegister}
              />
            )}
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
} 