'use client';

import { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle, RefreshCw, Edit } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SimpleLoadingScreen } from '@/components/SimpleLoadingScreen';
import { useBranding } from '@/lib/BrandingContext';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function InstructionsSentContent() {
  const { isLoading } = useBranding();
  const [isResending, setIsResending] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [errorContent, setErrorContent] = useState({
    title: '',
    message: '',
    description: ''
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  // Show simple loading screen until branding is ready
  if (isLoading) {
    return <SimpleLoadingScreen />;
  }

  // If no email parameter, redirect back to forgot password
  if (!email) {
    router.push('/forgot-password');
    return <SimpleLoadingScreen />;
  }

  // Handle resend instructions
  const handleResend = async () => {
    setIsResending(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorContent({
          title: 'Resend Failed',
          message: data.message || 'Failed to resend password reset email',
          description: 'Please try again. If the problem persists, contact support.'
        });
        setShowErrorDialog(true);
      } else {
        setShowSuccessDialog(true);
      }
    } catch (error) {
      console.error('Resend password error:', error);
      setErrorContent({
        title: 'Network Error',
        message: 'Unable to resend password reset request',
        description: 'Please check your internet connection and try again.'
      });
      setShowErrorDialog(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full mb-6"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">Check Your Email!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            We've sent password reset instructions to:
          </p>
          <p className="text-lg font-semibold text-[var(--brand-primary)] dark:text-blue-400 mb-4">
            {email}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please check your email inbox (and spam folder) for the reset link.
            The link will expire in <strong>24 hours</strong> for security.
          </p>
        </div>

        {/* Main Action Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 space-y-4"
        >
          {/* Resend Button */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Button
              onClick={handleResend}
              disabled={isResending}
              className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Resending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Resend Instructions
                </>
              )}
            </Button>
          </motion.div>

          {/* Change Email Button */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Button
              onClick={() => router.push('/forgot-password')}
              variant="outline"
              className="w-full h-12 border-2 border-gray-200 dark:border-gray-600 hover:border-[var(--brand-primary)] dark:hover:border-blue-400 hover:bg-[var(--brand-primary)]/5 dark:hover:bg-blue-500/10 text-gray-700 dark:text-gray-300 hover:text-[var(--brand-primary)] dark:hover:text-blue-400 font-semibold rounded-xl transition-all duration-300"
            >
              <Edit className="w-5 h-5 mr-2" />
              Change Email Address
            </Button>
          </motion.div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
            </div>
          </div>

          {/* Back to Login */}
          <Link href="/login">
            <Button
              variant="ghost"
              className="w-full h-12 text-gray-600 dark:text-gray-400 hover:text-[var(--brand-primary)] dark:hover:text-blue-400 hover:bg-[var(--brand-primary)]/5 dark:hover:bg-blue-500/10 font-medium rounded-xl transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </motion.div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center justify-center">
              <Mail className="w-4 h-4 mr-2" />
              Email Not Received?
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-left">
              <li>• Check your spam/junk folder</li>
              <li>• Ensure {email} is correct</li>
              <li>• Wait a few minutes for delivery</li>
              <li>• Contact support if issues persist</li>
            </ul>
          </div>
        </motion.div>

        {/* Additional Help */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link 
              href="/register" 
              className="text-[var(--brand-primary)] dark:text-blue-400 hover:text-[var(--brand-primary)]/80 dark:hover:text-blue-300 font-semibold transition-colors duration-200"
            >
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </motion.div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Instructions Resent!
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="font-medium text-gray-900 dark:text-gray-100 block">Password reset instructions have been resent successfully.</span>
              <span className="text-gray-600 dark:text-gray-400 block">
                Please check your email inbox again for the new reset link.
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              onClick={() => setShowSuccessDialog(false)}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              Got it
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
              Try Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InstructionsSentPage() {
  return (
    <Suspense fallback={<SimpleLoadingScreen />}>
      <InstructionsSentContent />
    </Suspense>
  );
} 