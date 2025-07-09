'use client';

import { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface AccountVerificationBannerProps {
  userName: string;
  onDismiss?: () => void;
  isDismissible?: boolean;
}

export function AccountVerificationBanner({ 
  userName, 
  onDismiss, 
  isDismissible = false 
}: AccountVerificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-800 mb-6">
      <Clock className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium mb-1">
            🔍 Account Under Verification
          </div>
          <div className="text-sm">
            Hello {userName}! Your account is currently being reviewed by our team. 
            You'll receive an email notification once your Sippy account is activated and ready for calls.
          </div>
          <div className="text-xs mt-2 opacity-75">
            This process typically takes 1-2 business days. Thank you for your patience!
          </div>
        </div>
        {isDismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="ml-4 h-6 w-6 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
} 