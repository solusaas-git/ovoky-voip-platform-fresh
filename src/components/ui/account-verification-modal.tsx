'use client';

import { AlertTriangle, Mail, Shield, LogOut, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { useBranding } from '@/hooks/useBranding';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface AccountVerificationModalProps {
  userName: string;
  userEmail: string;
  isOpen: boolean;
}

export function AccountVerificationModal({ 
  userName, 
  userEmail, 
  isOpen 
}: AccountVerificationModalProps) {
  const { logout } = useAuth();
  const { getSupportEmailLink } = useBranding();
  const router = useRouter();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Check onboarding status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkOnboardingStatus();
    }
  }, [isOpen]);

  const checkOnboardingStatus = async () => {
    try {
      setIsCheckingOnboarding(true);
      const response = await fetch('/api/user/onboarding');
      
      if (response.ok) {
        const data = await response.json();
        setHasCompletedOnboarding(data.onboarding?.completed || false);
      } else {
        // No onboarding data found
        setHasCompletedOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setIsCheckingOnboarding(false);
    }
  };

  const handleContactSupport = () => {
    // Use dynamic support email from branding
    window.open(getSupportEmailLink('Account Activation Request'));
  };

  const handleLogout = () => {
    logout();
  };

  const handleCompleteOnboarding = () => {
    // Reload the page to trigger the onboarding flow
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent 
        className="sm:max-w-[450px] border-2 border-amber-200 dark:border-amber-800 shadow-2xl bg-white dark:bg-gray-900"
      >
        <DialogHeader className="text-center space-y-3">
          {/* Warning Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          
          <DialogTitle className="text-xl font-bold text-amber-800 dark:text-amber-200 text-center">
            Account Under Review
          </DialogTitle>
          
          <DialogDescription className="text-center text-sm text-amber-700 dark:text-amber-300">
            Hello <span className="font-semibold">{userName}</span>! Your account is being reviewed by our team.
          </DialogDescription>
        </DialogHeader>

        {/* Main Content */}
        <div className="space-y-3">
          {/* Account Status - Compact */}
          <div className="flex justify-center space-x-4">
            <div className="flex items-center space-x-1 text-xs">
              <Mail className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Email ✓</span>
            </div>
            <div className="flex items-center space-x-1 text-xs">
              <Shield className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-700 dark:text-amber-300">Account ⏳</span>
            </div>
          </div>

          {/* Main Message - Compact */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              Access to dashboard and calling features is temporarily restricted until your 
              Sippy account is configured. You'll receive an email notification once activated.
            </p>
          </div>

          {/* Onboarding Notice - Show if onboarding not completed */}
          {!isCheckingOnboarding && hasCompletedOnboarding === false && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <div className="font-medium mb-1">Complete Your Profile</div>
                  <div>You haven't completed the onboarding process yet. Completing your business profile helps us expedite the review process.</div>
                </div>
              </div>
            </div>
          )}

          {/* Compact Timeline */}
          <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 text-sm">What's next?</h4>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <div>1. Team reviews registration → 2. Account setup → 3. Email notification → 4. Full access</div>
              <div className="font-medium pt-1">📅 Estimated time: 1-2 business days</div>
            </div>
          </div>

          {/* Contact info */}
          <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Notification will be sent to <span className="font-mono text-xs">{userEmail}</span>
          </div>
        </div>

        {/* Action Buttons - Compact */}
        <div className="space-y-3 mt-4">
          {/* Show onboarding button if not completed */}
          {!isCheckingOnboarding && hasCompletedOnboarding === false && (
            <Button 
              onClick={handleCompleteOnboarding}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white h-9"
            >
              <FileText className="mr-2 h-4 w-4" />
              Complete Onboarding
            </Button>
          )}
          
          <div className="flex space-x-2">
            <Button 
              onClick={handleContactSupport}
              className="flex-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white h-9"
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
            
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="flex-1 h-9 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 dark:hover:text-red-300"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Need help? Our support team is here to assist.
            </p>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
          <span>Verification in progress...</span>
        </div>
      </DialogContent>
    </Dialog>
  );
} 