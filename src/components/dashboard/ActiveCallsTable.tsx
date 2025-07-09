'use client';

import { useState } from 'react';
import { Phone, PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActiveCalls } from '@/lib/hooks';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Call } from '@/lib/sippyClient';
import { formatDistanceToNow } from 'date-fns';

export function ActiveCallsTable() {
  const { data: calls, isLoading, error, mutate } = useActiveCalls();
  const { sippyClient } = useAuth();
  const [disconnectingCalls, setDisconnectingCalls] = useState<Set<number>>(new Set());

  // Handle disconnecting a call
  const handleDisconnect = async (call: Call) => {
    if (!sippyClient || disconnectingCalls.has(call.i_call)) return;
    
    try {
      // Mark this call as being disconnected
      setDisconnectingCalls(prev => new Set(prev).add(call.i_call));
      
      // Call the API
      await sippyClient.disconnectCall({ i_call: call.i_call });
      
      // Show success toast
      toast.success(`Disconnected call to ${call.cld}`);
      
      // Refresh the calls list
      mutate();
    } catch (error) {
      console.error('Error disconnecting call:', error);
      toast.error('Failed to disconnect call');
    } finally {
      // Remove from disconnecting state
      setDisconnectingCalls(prev => {
        const newSet = new Set(prev);
        newSet.delete(call.i_call);
        return newSet;
      });
    }
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Compute time since connection
  const getTimeAgo = (connectTime: string): string => {
    try {
      return formatDistanceToNow(new Date(connectTime), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-md text-destructive bg-destructive/10">
        <p>Error loading active calls</p>
      </div>
    );
  }

  if (!calls || calls.length === 0) {
    return (
      <div className="p-8 text-center border rounded-md">
        <Phone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No active calls</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>CLI</TableHead>
            <TableHead>CLD</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Connected</TableHead>
            <TableHead>Node ID</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <TableRow key={call.i_call}>
              <TableCell className="font-medium">{call.cli}</TableCell>
              <TableCell>{call.cld}</TableCell>
              <TableCell>{formatDuration(call.call_duration)}</TableCell>
              <TableCell>{getTimeAgo(call.connect_time)}</TableCell>
              <TableCell>{call.node_id}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDisconnect(call)}
                  disabled={disconnectingCalls.has(call.i_call)}
                >
                  {disconnectingCalls.has(call.i_call) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <PhoneOff className="h-4 w-4 mr-1" />
                  )}
                  Disconnect
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 