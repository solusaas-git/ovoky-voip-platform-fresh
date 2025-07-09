import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

export function useOnboarding() {
  const { user } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkOnboardingStatus = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/onboarding');
      
      if (response.ok) {
        const data = await response.json();
        setHasCompletedOnboarding(data.onboarding?.completed || false);
      } else if (response.status === 404) {
        // No onboarding data found
        setHasCompletedOnboarding(false);
      } else {
        console.error('Failed to check onboarding status');
        setHasCompletedOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
  }, [user?.id]);

  const markOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
  };

  // Determine if user needs onboarding
  const needsOnboarding = user && 
    user.isEmailVerified && 
    !user.sippyAccountId && 
    hasCompletedOnboarding === false;

  // Determine if user needs verification (after onboarding)
  const needsVerification = user && 
    user.isEmailVerified && 
    !user.sippyAccountId && 
    hasCompletedOnboarding === true;

  return {
    needsOnboarding,
    needsVerification,
    hasCompletedOnboarding,
    isLoading,
    markOnboardingComplete,
    refetch: checkOnboardingStatus
  };
} 