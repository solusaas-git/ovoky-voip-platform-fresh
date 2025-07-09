'use client';

import { useState } from 'react';
import { CheckCircle, Hash, AlertCircle, Loader2, Mail, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AccountActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: (sippyAccountId: number) => Promise<void>;
  userName: string;
  userEmail: string;
}

export function AccountActivationModal({
  isOpen,
  onClose,
  onActivate,
  userName,
  userEmail
}: AccountActivationModalProps) {
  const [sippyAccountId, setSippyAccountId] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!sippyAccountId.trim()) {
      setError('Sippy Account ID is required');
      return;
    }

    const accountId = parseInt(sippyAccountId.trim());
    if (isNaN(accountId) || accountId <= 0) {
      setError('Please enter a valid numeric Sippy Account ID');
      return;
    }

    try {
      setIsActivating(true);
      await onActivate(accountId);
      handleClose();
      toast.success(`Account activated for ${userName}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to activate account');
    } finally {
      setIsActivating(false);
    }
  };

  const handleClose = () => {
    setSippyAccountId('');
    setError('');
    setIsActivating(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-4">
          {/* Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>

          <DialogTitle className="text-center text-xl font-bold">
            Activate User Account
          </DialogTitle>
          
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Assign a Sippy Account ID to activate this user's account and grant full access.
          </DialogDescription>
        </DialogHeader>

        {/* User Info */}
        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{userName}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Mail className="mr-1 h-3 w-3" />
                {userEmail}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sippy Account ID Input */}
          <div className="space-y-2">
            <Label htmlFor="sippyAccountId" className="text-sm font-medium flex items-center">
              <Hash className="mr-2 h-4 w-4" />
              Sippy Account ID
            </Label>
            <Input
              id="sippyAccountId"
              type="number"
              value={sippyAccountId}
              onChange={(e) => setSippyAccountId(e.target.value)}
              placeholder="Enter Sippy Account ID (e.g., 12345)"
              className="h-11"
              min="1"
              required
              disabled={isActivating}
            />
            {error && (
              <div className="flex items-center space-x-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <div className="font-medium mb-1">Action Summary:</div>
                <ul className="space-y-1">
                  <li>• User will be granted full dashboard access</li>
                  <li>• Activation email will be sent automatically</li>
                  <li>• User can immediately start making calls</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isActivating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isActivating}
            >
              {isActivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activate Account
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            The user will receive an email notification once activated
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 