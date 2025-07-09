'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Clock, CheckCircle, XCircle, AlertTriangle, Star } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SenderId {
  _id: string;
  senderId: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  type: 'alphanumeric' | 'numeric';
  userId: string;
  userName: string;
  userEmail: string;
  userCompany?: string | null;
  usageCount: number;
  lastUsedAt?: string;
  isDefault: boolean;
  rejectionReason?: string;
  suspensionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export function AdminSmsSenderIds() {
  const { t } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [senderIds, setSenderIds] = useState<SenderId[]>([]);
  const [rejectionDialog, setRejectionDialog] = useState<{
    isOpen: boolean;
    senderId: SenderId | null;
    reason: string;
    type: 'reject' | 'suspend';
  }>({
    isOpen: false,
    senderId: null,
    reason: '',
    type: 'reject'
  });

  useEffect(() => {
    loadSenderIds();
  }, []);

  const loadSenderIds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sms/sender-ids');
      if (response.ok) {
        const data = await response.json();
        setSenderIds(data.senderIds || []);
      } else {
        toast.error('Failed to load sender IDs');
      }
    } catch (error) {
      toast.error('Failed to load sender IDs');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (senderId: SenderId, newStatus: 'approved' | 'rejected', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/sms/sender-ids/${senderId._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'rejected' && { rejectionReason: reason })
        }),
      });

      if (response.ok) {
        toast.success(`Sender ID ${newStatus} successfully`);
        loadSenderIds();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || `Failed to ${newStatus} sender ID`);
      }
    } catch (error) {
      toast.error(`Failed to ${newStatus} sender ID`);
    }
  };

  const openRejectionDialog = (senderId: SenderId, type: 'reject' | 'suspend') => {
    setRejectionDialog({
      isOpen: true,
      senderId,
      reason: '',
      type
    });
  };

  const closeRejectionDialog = () => {
    setRejectionDialog({
      isOpen: false,
      senderId: null,
      reason: '',
      type: 'reject'
    });
  };

  const handleRejectConfirm = async () => {
    if (!rejectionDialog.senderId) return;
    
    await handleStatusUpdate(rejectionDialog.senderId, 'rejected', rejectionDialog.reason || undefined);
    closeRejectionDialog();
  };

  const getStatusBadge = (status: SenderId['status']) => {
    const statusConfig = {
      pending: { 
        icon: Clock, 
        variant: 'secondary' as const, 
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        label: 'Pending'
      },
      approved: { 
        icon: CheckCircle, 
        variant: 'secondary' as const, 
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        label: 'Approved'
      },
      rejected: { 
        icon: XCircle, 
        variant: 'secondary' as const, 
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        label: 'Rejected'
      },
      suspended: { 
        icon: AlertTriangle, 
        variant: 'secondary' as const, 
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        label: 'Suspended'
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading sender IDs...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Sender ID Requests
            </CardTitle>
            <CardDescription>
              Manage all sender ID requests across the system
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {senderIds.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground mt-4">No sender ID requests</p>
            <p className="text-sm text-muted-foreground mt-2">
              Sender ID requests will appear here for approval
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sender ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {senderIds.map((senderId) => (
                <TableRow key={senderId._id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{senderId.senderId}</span>
                      {senderId.isDefault && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    {senderId.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {senderId.description}
                      </div>
                    )}
                    {(senderId.rejectionReason || senderId.suspensionReason) && (
                      <div className="text-sm text-destructive mt-1">
                        Reason: {senderId.rejectionReason || senderId.suspensionReason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{senderId.userName}</div>
                      {senderId.userCompany && (
                        <div className="text-muted-foreground">{senderId.userCompany}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(senderId.status)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {senderId.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{senderId.usageCount} times</div>
                      {senderId.lastUsedAt && (
                        <div className="text-muted-foreground">
                          Last: {formatDistanceToNow(new Date(senderId.lastUsedAt), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(senderId.createdAt), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {senderId.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusUpdate(senderId, 'approved')}
                            className="text-green-600 hover:text-green-600"
                            title="Approve sender ID"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRejectionDialog(senderId, 'reject')}
                            className="text-red-600 hover:text-red-600"
                            title="Reject sender ID"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {senderId.status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRejectionDialog(senderId, 'suspend')}
                          className="text-orange-600 hover:text-orange-600"
                          title="Suspend sender ID"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Rejection/Suspension Dialog */}
      <Dialog open={rejectionDialog.isOpen} onOpenChange={closeRejectionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {rejectionDialog.type === 'reject' ? 'Reject Sender ID' : 'Suspend Sender ID'}
            </DialogTitle>
            <DialogDescription>
              {rejectionDialog.type === 'reject' 
                ? `Are you sure you want to reject the sender ID "${rejectionDialog.senderId?.senderId}"?`
                : `Are you sure you want to suspend the sender ID "${rejectionDialog.senderId?.senderId}"?`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                {rejectionDialog.type === 'reject' ? 'Rejection reason (optional)' : 'Suspension reason (required)'}
              </Label>
              <Textarea
                id="reason"
                value={rejectionDialog.reason}
                onChange={(e) => setRejectionDialog(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={rejectionDialog.type === 'reject' 
                  ? 'Provide a reason for rejecting this sender ID...'
                  : 'Provide a reason for suspending this sender ID...'
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeRejectionDialog}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectConfirm}
              disabled={rejectionDialog.type === 'suspend' && !rejectionDialog.reason.trim()}
            >
              {rejectionDialog.type === 'reject' ? 'Reject' : 'Suspend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 