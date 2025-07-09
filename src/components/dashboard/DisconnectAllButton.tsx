'use client';

import { useState } from 'react';
import { PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { useActiveCalls } from '@/lib/hooks';

export function DisconnectAllButton() {
  const { sippyClient } = useAuth();
  const { mutate } = useActiveCalls();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDisconnectAll = async () => {
    if (!sippyClient) {
      toast.error('Not authenticated');
      return;
    }

    try {
      setIsDisconnecting(true);
      
      // Get the account ID from the first active call, or use a default account
      const accountId = 0; // In a real app, you might get this from user selection or active calls
      
      await sippyClient.disconnectAccount({ i_account: accountId });
      
      // Close the dialog
      setIsDialogOpen(false);
      
      // Show success toast
      toast.success('All calls have been disconnected');
      
      // Refresh the calls list
      mutate();
    } catch (error) {
      console.error('Error disconnecting all calls:', error);
      toast.error('Failed to disconnect all calls');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <PhoneOff className="mr-2 h-4 w-4" />
          Disconnect All Calls
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect All Calls</DialogTitle>
          <DialogDescription>
            This will disconnect all active calls for the account. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isDisconnecting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDisconnectAll}
            disabled={isDisconnecting}
          >
            {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 