'use client';

import { useState, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { EmailVerificationForm } from '@/components/auth/EmailVerificationForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { handleAuthError } from '@/lib/apiErrorHandler';
import { useTranslations } from '@/lib/i18n';

// Form validation schema with dynamic error messages
const createFormSchema = (t: (key: string) => string) => z.object({
  email: z.string().email({ message: t('auth.validation.emailInvalid') }),
  password: z.string().min(1, { message: t('auth.validation.required') }),
});

export function LoginForm() {
  const { login } = useAuth();
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [modalShake, setModalShake] = useState(false);
  const [errorDialogContent, setErrorDialogContent] = useState({
    title: '',
    message: '',
    description: ''
  });





  // Form definition with dynamic schema
  const formSchema = createFormSchema(t);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });



  // Form submission handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
      await login(values.email, values.password);
      
    } catch (error: unknown) {
      // Handle different error types
      const authError = error as { code?: string; message?: string };
      if (authError?.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationEmail(values.email);
        setShowVerificationModal(true);
        toast.error(authError.message || t('auth.errors.emailNotVerified'));
      } else {
        const errorData = handleAuthError(error as { message?: string; status?: number; code?: string; error?: string; [key: string]: unknown });
        setErrorDialogContent({
          title: errorData.title,
          message: errorData.message,
          description: errorData.description
        });
        setShowErrorDialog(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleVerificationSuccess = async () => {
    setShowVerificationModal(false);
    
    // Automatically attempt login after verification
    try {
      const formValues = form.getValues();
      toast.success(t('auth.verification.success'));
      await login(formValues.email, formValues.password);
    } catch {
      toast.error(t('auth.errors.serverError'));
    }
  };

  const handleBackToLogin = () => {
    setShowVerificationModal(false);
    setVerificationEmail('');
  };

  // Function to trigger shake animation when trying to close modal
  const triggerModalShake = () => {
    setModalShake(true);
    setTimeout(() => setModalShake(false), 500); // Reset after animation
  };

  return (
    <div className="w-full space-y-4">
      {/* Main Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[var(--brand-primary)] transition-colors duration-200" />
                    </div>
                    <Input
                      type="email"
                      placeholder={t('auth.login.emailPlaceholder')}
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
                      <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[var(--brand-primary)] transition-colors duration-200" />
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.login.passwordPlaceholder')}
                      className="pl-12 pr-12 h-12 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 rounded-xl transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600"
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
                <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
              </FormItem>
            )}
          />

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <Link 
              href="/forgot-password" 
              className="text-sm text-[var(--brand-primary)] dark:text-blue-400 hover:text-[var(--brand-primary)]/80 dark:hover:text-blue-300 transition-colors duration-200 font-medium"
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>





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
                  {t('auth.login.submitting')}
                </>
              ) : (
                <>
                  {t('auth.login.submitButton')}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </Form>

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
          Continue with Google
        </Button>
      </motion.div>

      {/* Sign Up Link */}
      <div className="text-center pt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('auth.login.noAccount')}{' '}
          <Link 
            href="/register" 
            className="text-[var(--brand-primary)] dark:text-blue-400 hover:text-[var(--brand-primary)]/80 dark:hover:text-blue-300 font-semibold transition-colors duration-200"
          >
            {t('auth.login.createAccount')}
          </Link>
        </p>
      </div>

      {/* Email Verification Modal */}
      <Dialog open={showVerificationModal} onOpenChange={(open) => {
        // Only allow closing if explicitly called (not from outside click)
        // The modal should only close via the back button or verification success
        if (!open) {
          // Don't auto-close on outside click, but show feedback
          triggerModalShake();
          return;
        }
        handleBackToLogin();
      }}>
        <DialogContent 
          className="sm:max-w-[425px]"
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
                {t('auth.verification.description')}
              </DialogDescription>
            </DialogHeader>
            
            {verificationEmail && (
              <EmailVerificationForm
                email={verificationEmail}
                name="" // We don't have the name from login form
                onVerificationSuccess={handleVerificationSuccess}
                onBackToRegister={handleBackToLogin}
              />
            )}
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {errorDialogContent.title}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="font-medium text-gray-900 dark:text-gray-100 block">{errorDialogContent.message}</span>
              <span className="text-gray-600 dark:text-gray-400 block">{errorDialogContent.description}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              onClick={() => setShowErrorDialog(false)}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {t('common.actions.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 