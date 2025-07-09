'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  email: z.string().email({ message: t('auth.validation.emailInvalid') }),
});

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [errorContent, setErrorContent] = useState({
    title: '',
    message: '',
    description: ''
  });

  const router = useRouter();
  const { settings, isLoading: brandingLoading } = useBranding();
  const { getLogoUrl, company } = useBrandingHook();
  const { t, isLoading: translationsLoading } = useTranslations();

  // Always call useForm hook - no conditional logic before it
  const formSchema = createFormSchema(t);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  // Show loading screen until both branding and translations are ready
  if (brandingLoading || translationsLoading) {
    return <SimpleLoadingScreen />;
  }

  const companyName = settings.companyName || 'OVOKY';
  const logoUrl = getLogoUrl();
  const logoAltText = company.logoAltText;

  // Form submission handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: values.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('auth.errors.serverError'));
      }

      // Show success dialog regardless of whether email exists
      setUserEmail(values.email);
      setShowSuccessDialog(true);

    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.errors.serverError');
      setErrorContent({
        title: t('auth.errors.title'),
        message: message,
        description: t('auth.errors.tryAgain')
      });
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md space-y-4 sm:space-y-8 my-auto"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center space-y-2 sm:space-y-4"
        >
          <motion.div 
            className="w-40 h-24 sm:w-48 sm:h-32 lg:w-64 lg:h-40 flex items-center justify-center mx-auto mb-2"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoAltText}
                className="w-24 h-16 sm:w-32 sm:h-20 lg:w-40 lg:h-24 object-contain"
              />
            ) : (
              <div className="mx-auto h-16 w-16 sm:h-16 sm:w-16 bg-gradient-to-r from-[var(--brand-primary)] to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Mail className="h-8 w-8 sm:h-8 sm:w-8 text-white" />
              </div>
            )}
          </motion.div>
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
              {t('auth.forgotPassword.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg font-medium">
              {t('auth.forgotPassword.subtitle')}
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
              {t('auth.forgotPassword.description')}
            </p>
          </div>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 sm:p-6 lg:p-8"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          placeholder={t('auth.forgotPassword.emailPlaceholder')}
                          className="pl-12 h-12 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-700 focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 rounded-xl transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 hover:border-gray-300 dark:hover:border-gray-500"
                          {...field}
                        />
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
                  disabled={isLoading}
                  className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group transform hover:-translate-y-0.5 border-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      {t('auth.forgotPassword.submitting')}
                    </>
                  ) : (
                    <>
                      {t('auth.forgotPassword.submitButton')}
                      <Mail className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )}
                </Button>
              </motion.div>

              {/* Back to Login */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center"
              >
                <Link 
                  href="/login" 
                  className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-[var(--brand-primary)] dark:hover:text-blue-300 font-medium transition-colors duration-200 group"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                  {t('auth.forgotPassword.backToLogin')}
                </Link>
              </motion.div>
            </form>
          </Form>
        </motion.div>

        {/* Sign up link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('auth.login.noAccount')}{' '}
            <Link 
              href="/register" 
              className="text-[var(--brand-primary)] dark:text-blue-400 hover:text-[var(--brand-primary)]/80 dark:hover:text-blue-300 font-semibold transition-colors duration-200"
            >
              {t('auth.login.createAccount')}
            </Link>
          </p>
        </motion.div>
      </motion.div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Mail className="w-5 h-5" />
              {t('auth.forgotPassword.emailSent.title')}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="font-medium text-gray-900 dark:text-gray-100 block">
                {t('auth.forgotPassword.emailSent.message')}
              </span>
              <span className="text-gray-600 dark:text-gray-400 block">
                {t('auth.forgotPassword.emailSent.instruction')}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-500 block mt-2">
                {userEmail}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false);
                setUserEmail('');
              }}
            >
              {t('common.actions.close')}
            </Button>
            <Button 
              onClick={() => {
                setShowSuccessDialog(false);
                router.push('/login');
              }}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {t('auth.forgotPassword.backToLogin')}
            </Button>
          </div>
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
              {errorContent.title}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="font-medium text-gray-900 dark:text-gray-100 block">{errorContent.message}</span>
              <span className="text-gray-600 dark:text-gray-400 block">{errorContent.description}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              onClick={() => setShowErrorDialog(false)}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {t('common.actions.tryAgain')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 