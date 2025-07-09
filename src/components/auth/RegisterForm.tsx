'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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
import { EmailVerificationForm } from './EmailVerificationForm';
import { useBranding } from '@/lib/BrandingContext';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: 'Password must contain at least one letter and one digit' }),
});

type RegistrationStep = 'register' | 'verify-email';

interface RegistrationData {
  name: string;
  email: string;
  userId?: string;
}

export function RegisterForm() {
  const router = useRouter();
  const { settings, isLoading } = useBranding();
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('register');
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);

  const companyName = isLoading ? 'the' : (settings.companyName || 'the');

  // Form definition
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  // Form submission handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoadingForm(true);
    
    try {
      // Register with the internal system
      // Using a default sippyAccountId for clients
      // This will be managed by the admin
      const defaultSippyAccountId = 1000;
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          sippyAccountId: defaultSippyAccountId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data.requiresVerification) {
        // Store registration data and move to verification step
        setRegistrationData({
          name: values.name,
          email: values.email,
          userId: data.userId,
        });
        setCurrentStep('verify-email');
        toast.success('Registration successful! Please check your email.');
      } else {
        // Shouldn't happen with new flow, but handle just in case
        toast.success('Registration successful!');
        router.push('/dashboard');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
    } finally {
      setIsLoadingForm(false);
    }
  }

  // Handle successful email verification
  const handleVerificationSuccess = () => {
    toast.success('Email verified! You can now log in.');
    router.push('/login'); // Redirect to login page
  };

  // Handle back to registration
  const handleBackToRegister = () => {
    setCurrentStep('register');
    setRegistrationData(null);
  };

  // Render verification step
  if (currentStep === 'verify-email' && registrationData) {
    return (
      <EmailVerificationForm
        email={registrationData.email}
        name={registrationData.name}
        onVerificationSuccess={handleVerificationSuccess}
        onBackToRegister={handleBackToRegister}
      />
    );
  }

  // Render registration step
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an Account</CardTitle>
        <CardDescription>
          Register to access the {companyName} dashboard
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Create a password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters and contain at least one letter and one digit
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoadingForm}
            >
              {isLoadingForm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoadingForm ? 'Creating Account...' : 'Create Account'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 