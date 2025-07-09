'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from '@/lib/i18n';

// Form validation schema with dynamic error messages
const createFormSchema = (t: (key: string) => string) => z.object({
  otpCode: z.string()
    .length(6, { message: t('auth.verification.codeLength') })
    .regex(/^\d+$/, { message: t('auth.verification.codeNumeric') }),
});

interface EmailVerificationFormProps {
  email: string;
  name: string;
  onVerificationSuccess: () => void;
  onBackToRegister?: () => void;
}

export function EmailVerificationForm({ 
  email, 
  name, 
  onVerificationSuccess, 
  onBackToRegister 
}: EmailVerificationFormProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCount, setResendCount] = useState(0);
  const [nextResendTime, setNextResendTime] = useState(0);
  const { t } = useTranslations();

  // Form definition with dynamic schema
  const formSchema = createFormSchema(t);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otpCode: '',
    },
  });

  // Countdown timer for resend button
  useEffect(() => {
    if (nextResendTime > 0) {
      const timer = setTimeout(() => {
        setNextResendTime(nextResendTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [nextResendTime]);

  // Form submission handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsVerifying(true);
    setVerificationStatus('idle');
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otpCode: values.otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('auth.errors.serverError'));
      }

      setVerificationStatus('success');
      toast.success(t('auth.verification.success'));
      
      // Call success callback after a brief delay to show success state
      setTimeout(() => {
        onVerificationSuccess();
      }, 1500);

    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.errors.serverError');
      setErrorMessage(message);
      setVerificationStatus('error');
      toast.error(message);
      
      // Clear the form on error
      form.reset();
    } finally {
      setIsVerifying(false);
    }
  }

  // Resend verification email
  const handleResendEmail = async () => {
    setIsResending(true);
    
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('auth.errors.serverError'));
      }

      toast.success(t('auth.verification.resendSuccess'));
      setResendCount(prev => prev + 1);
      setNextResendTime(60); // 60 second cooldown

    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.errors.serverError');
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Mail className="h-5 w-5 text-blue-500" />;
    }
  };

  // Get status message
  const getStatusMessage = () => {
    if (resendCount > 0) {
      return t('auth.verification.resendNote');
    }
    return t('auth.verification.emailSent');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          {getStatusIcon()}
        </div>
        <CardTitle>{t('auth.verification.title')}</CardTitle>
        <CardDescription>
          {t('auth.verification.enterCode')}
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                {getStatusMessage()}
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="otpCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.verification.codeLabel')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t('auth.verification.codePlaceholder')}
                      {...field}
                      maxLength={6}
                      className="text-center text-lg tracking-widest font-mono"
                      disabled={isVerifying || verificationStatus === 'success'}
                      autoComplete="one-time-code"
                    />
                  </FormControl>
                  <FormDescription>
                    {t('auth.verification.codeExpiry')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMessage && verificationStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isVerifying || verificationStatus === 'success'}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.verification.verifying')}
                </>
              ) : verificationStatus === 'success' ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('auth.verification.verified')}
                </>
              ) : (
                t('auth.verification.submitButton')
              )}
            </Button>

            <div className="flex flex-col items-center space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="text-center">
                <span>{t('auth.verification.noEmail')} </span>
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendEmail}
                  disabled={isResending || nextResendTime > 0 || verificationStatus === 'success'}
                  className="p-0 h-auto font-medium text-[var(--brand-primary)] dark:text-blue-400 hover:text-[var(--brand-primary)]/80 dark:hover:text-blue-300"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      {t('auth.verification.resending')}
                    </>
                  ) : nextResendTime > 0 ? (
                    t('auth.verification.resendCooldown').replace('{seconds}', nextResendTime.toString())
                  ) : (
                    t('auth.verification.resend')
                  )}
                </Button>
              </div>

              {onBackToRegister && (
                <Button
                  type="button"
                  variant="link"
                  onClick={onBackToRegister}
                  className="p-0 h-auto text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {t('auth.verification.backToRegister')}
                </Button>
              )}
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 