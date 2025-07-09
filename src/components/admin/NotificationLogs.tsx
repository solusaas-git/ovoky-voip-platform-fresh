'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  Search, 
  RefreshCw, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RotateCcw, 
  Send, 
  MailCheck, 
  User, 
  Trash2,
  TestTube
} from 'lucide-react';
import { toast } from 'sonner';
import { NotificationLog, NotificationStats } from '@/models/NotificationLog';
import { format } from 'date-fns';
import { handleApiError, apiRequest } from '@/lib/apiErrorHandler';
import React from 'react';

interface NotificationLogsResponse {
  logs: NotificationLog[];
  stats: NotificationStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  sippyAccountId?: number;
  role: string;
}

// Reusable User Selection Component
const UserSelect = ({ 
  value, 
  onValueChange, 
  users, 
  isLoading, 
  categoryPrefix 
}: {
  value: string;
  onValueChange: (value: string) => void;
  users: User[];
  isLoading: boolean;
  categoryPrefix: string;
}) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger>
      <SelectValue placeholder="Select a user..." />
    </SelectTrigger>
    <SelectContent>
      {isLoading ? (
        <div key="loading" className="flex items-center justify-center p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2">Loading users...</span>
        </div>
      ) : users.length === 0 ? (
        <div key="no-users" className="p-2 text-sm text-muted-foreground">
          No users found
        </div>
      ) : (
        users.map((user, index) => {
          const userId = user.id || user._id || `user-${index}`;
          const userValue = user.id || user._id || user.email || `user-${index}`;
          return (
            <SelectItem key={`${categoryPrefix}-user-${userId}`} value={String(userValue)}>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{user.name} ({user.email})</span>
                {user.sippyAccountId ? (
                  <Badge key={`${categoryPrefix}-sippy-${userId}`} variant="outline" className="text-xs">
                    ID: {user.sippyAccountId}
                  </Badge>
                ) : (
                  <Badge key={`${categoryPrefix}-no-sippy-${userId}`} variant="secondary" className="text-xs">
                    No Sippy Account
                  </Badge>
                )}
              </div>
            </SelectItem>
          );
        })
      )}
    </SelectContent>
  </Select>
);

export function NotificationLogs() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    userId: ''
  });
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [isResending, setIsResending] = useState(false);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);

  // Test email state
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [testForm, setTestForm] = useState({
    userId: '',
    notificationType: 'low_balance',
    testBalance: '',
    testThreshold: '',
    // New fields for different notification categories
    testCategory: 'balance', // 'balance', 'auth', 'account', 'alerts', 'payment', 'ticket'
    ticketNotificationType: 'ticket_created',
    testEmail: '',
    includeCustomerInTest: false
  });
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filters]);

  useEffect(() => {
    if (isTestDialogOpen) {
      fetchUsers();
    }
  }, [isTestDialogOpen]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters.type && filters.type !== 'all' && { type: filters.type }),
        ...(filters.userId && { userId: filters.userId }),
      });

      const data: NotificationLogsResponse = await apiRequest(`/api/admin/notification-logs?${params}`);
      setLogs(data.logs);
      setStats(data.stats);
      setPagination(data.pagination);
      setSelectedLogs(new Set()); // Clear selection when logs change
    } catch (error) {
      handleApiError(error as any, 'Failed to load notification logs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch('/api/admin/users?limit=100');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (testForm.testCategory === 'ticket') {
      // Handle ticket notification test
      if (!testForm.ticketNotificationType || !testForm.userId) {
        toast.error('Please select a notification type and user');
        return;
      }

      // Get the selected user's email
      const selectedUser = users.find(user => 
        user.id === testForm.userId || 
        user._id === testForm.userId || 
        user.email === testForm.userId
      );
      if (!selectedUser) {
        toast.error('Selected user not found');
        return;
      }

      try {
        setIsSendingTest(true);
        const response = await fetch('/api/admin/tickets/test-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationType: testForm.ticketNotificationType,
            testEmail: selectedUser.email,
            includeCustomerInTest: testForm.includeCustomerInTest
          }),
        });

        if (response.ok) {
          await response.json();
          toast.success('Ticket notification test sent successfully');
          setIsTestDialogOpen(false);
          resetTestForm();
          // Refresh logs to show the test email
          setTimeout(() => {
            fetchLogs();
          }, 1000);
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to send test notification');
        }
      } catch (error) {
        console.error('Error sending test notification:', error);
        toast.error('Failed to send test notification');
      } finally {
        setIsSendingTest(false);
      }
    } else {
      // Handle general notification test (existing functionality)
      if (!testForm.userId || !testForm.notificationType) {
        toast.error('Please select a user and notification type');
        return;
      }

      try {
        setIsSendingTest(true);
        const response = await fetch('/api/admin/notification-logs/test-send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: testForm.userId,
            notificationType: testForm.notificationType,
            testBalance: testForm.testBalance,
            testThreshold: testForm.testThreshold
          }),
        });

        if (response.ok) {
          const result = await response.json();
          toast.success(result.message);
          setIsTestDialogOpen(false);
          resetTestForm();
          // Refresh logs to show the test email
          setTimeout(() => {
            fetchLogs();
          }, 1000);
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to send test email');
        }
      } catch (error) {
        console.error('Error sending test email:', error);
        toast.error('Failed to send test email');
      } finally {
        setIsSendingTest(false);
      }
    }
  };

  const resetTestForm = () => {
    setTestForm({
      userId: '',
      notificationType: 'low_balance',
      testBalance: '',
      testThreshold: '',
      testCategory: 'balance',
      ticketNotificationType: 'ticket_created',
      testEmail: '',
      includeCustomerInTest: false
    });
  };

  // Helper function to get default notification type for category
  const getDefaultNotificationType = (category: string) => {
    switch (category) {
      case 'balance': return 'low_balance';
      case 'auth': return 'email_verification';
      case 'account': return 'account_activation';
      case 'alerts': return 'high_cost_alert';
      case 'payment': return 'payment_success_gateway';
      case 'phone_numbers': return 'backorder_approved';
      default: return 'low_balance';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      sent: 'default',
      failed: 'destructive',
      pending: 'secondary'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      // Balance notifications
      low_balance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      zero_balance: 'bg-orange-100 text-orange-800 border-orange-200',
      negative_balance: 'bg-red-100 text-red-800 border-red-200',
      
      // Authentication templates
      email_verification: 'bg-blue-100 text-blue-800 border-blue-200',
      
      // Account management templates
      account_activation: 'bg-green-100 text-green-800 border-green-200',
      
      // Alert templates
      high_cost_alert: 'bg-red-100 text-red-800 border-red-200',
      low_asr_alert: 'bg-amber-100 text-amber-800 border-amber-200',
      extreme_usage_alert: 'bg-purple-100 text-purple-800 border-purple-200',
      
      // Payment notifications
      payment_success_gateway: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      payment_success_admin: 'bg-teal-100 text-teal-800 border-teal-200',
      
      // Password reset
      password_reset: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      
      // Ticket notifications
      ticket_created: 'bg-green-100 text-green-800 border-green-200',
      ticket_updated: 'bg-blue-100 text-blue-800 border-blue-200',
      ticket_resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      ticket_assigned: 'bg-purple-100 text-purple-800 border-purple-200',
      ticket_replied: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      
      // Phone number notifications
      backorder_approved: 'bg-green-100 text-green-800 border-green-200',
      backorder_rejected: 'bg-red-100 text-red-800 border-red-200',
      cancellation_approved: 'bg-orange-100 text-orange-800 border-orange-200',
      cancellation_rejected: 'bg-red-100 text-red-800 border-red-200',
      number_purchase_single: 'bg-blue-100 text-blue-800 border-blue-200',
      number_purchase_bulk: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      number_assignment: 'bg-purple-100 text-purple-800 border-purple-200',
      number_unassignment: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    
    const displayNames: Record<string, string> = {
      low_balance: 'Low Balance',
      zero_balance: 'Zero Balance',
      negative_balance: 'Negative Balance',
      email_verification: 'Email Verification',
      account_activation: 'Account Activation',
      high_cost_alert: 'High Cost Alert',
      low_asr_alert: 'Low ASR Alert',
      extreme_usage_alert: 'Extreme Usage Alert',
      payment_success_gateway: 'Payment Success',
      payment_success_admin: 'Admin Credit',
      password_reset: 'Password Reset',
      ticket_created: 'Ticket Created',
      ticket_updated: 'Ticket Updated',
      ticket_resolved: 'Ticket Resolved',
      ticket_assigned: 'Ticket Assigned',
      ticket_replied: 'Ticket Replied',
      backorder_approved: 'Backorder Approved',
      backorder_rejected: 'Backorder Rejected',
      cancellation_approved: 'Cancellation Approved',
      cancellation_rejected: 'Cancellation Rejected',
      number_purchase_single: 'Number Purchase (Single)',
      number_purchase_bulk: 'Number Purchase (Bulk)',
      number_assignment: 'Admin Assignment',
      number_unassignment: 'Admin Unassignment'
    };
    
    return (
      <Badge variant="outline" className={colors[type] || ''}>
        {displayNames[type] || type.replace('_', ' ')}
      </Badge>
    );
  };

  // Removed unused getNotificationIcon and getNotificationColor functions

  const handleFilterChange = (key: string, value: string) => {
    // Convert "all" to empty string for API compatibility
    const filterValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: filterValue }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({ status: 'all', type: 'all', userId: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const changePage = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleManualCheck = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/check-balances', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Balance check completed successfully');
        // Refresh logs after check
        setTimeout(() => {
          fetchLogs();
        }, 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to check balances');
      }
    } catch (error) {
      console.error('Error triggering balance check:', error);
      toast.error('Failed to trigger balance check');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendSingle = async (logId: string) => {
    try {
      setIsResending(true);
      const response = await fetch('/api/admin/notification-logs/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logIds: [logId] }),
      });

      if (response.ok) {
        await response.json();
        toast.success('Notification resent successfully');
        // Refresh logs after resend
        setTimeout(() => {
          fetchLogs();
        }, 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to resend notification');
      }
    } catch (error) {
      console.error('Error resending notification:', error);
      toast.error('Failed to resend notification');
    } finally {
      setIsResending(false);
    }
  };

  const handleBulkResend = async () => {
    if (selectedLogs.size === 0) {
      toast.error('Please select notifications to resend');
      return;
    }

    // Add confirmation for bulk operations
    if (!confirm(`Are you sure you want to resend ${selectedLogs.size} notification(s)? This will create new notification entries.`)) {
      return;
    }

    try {
      setIsResending(true);
      const response = await fetch('/api/admin/notification-logs/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logIds: Array.from(selectedLogs) }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || `Resent ${selectedLogs.size} notifications`);
        setSelectedLogs(new Set()); // Clear selection
        // Refresh logs after resend
        setTimeout(() => {
          fetchLogs();
        }, 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to resend notifications');
      }
    } catch (error) {
      console.error('Error resending notifications:', error);
      toast.error('Failed to resend notifications');
    } finally {
      setIsResending(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLogs(new Set(logs.map(log => log.id)));
    } else {
      setSelectedLogs(new Set());
    }
  };

  const handleSelectLog = (logId: string, checked: boolean) => {
    const newSelected = new Set(selectedLogs);
    if (checked) {
      newSelected.add(logId);
    } else {
      newSelected.delete(logId);
    }
    setSelectedLogs(newSelected);
  };

  const handleDeleteSingle = async (logId: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch('/api/admin/notification-logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [logId] }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        fetchLogs(); // Refresh the logs
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setLogToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLogs.size === 0) {
      toast.error('No notifications selected');
      return;
    }

    try {
      setIsDeleting(true);
      const ids = Array.from(selectedLogs);
      const response = await fetch('/api/admin/notification-logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setSelectedLogs(new Set()); // Clear selection
        fetchLogs(); // Refresh the logs
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete notifications');
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    } finally {
      setIsDeleting(false);
      setBulkDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.total || 0}</div>
              {selectedLogs.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedLogs.size} selected
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Total Sent</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalSent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Total Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.totalFailed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.totalPending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Notification Logs</span>
          </CardTitle>
          <CardDescription>
            View and filter email notification logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all-statuses" value="all">All Statuses</SelectItem>
                <SelectItem key="sent" value="sent">Sent</SelectItem>
                <SelectItem key="failed" value="failed">Failed</SelectItem>
                <SelectItem key="pending" value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all-types" value="all">All Types</SelectItem>
                
                {/* Balance Notifications */}
                <SelectItem key="low_balance_filter" value="low_balance">Low Balance</SelectItem>
                <SelectItem key="zero_balance_filter" value="zero_balance">Zero Balance</SelectItem>
                <SelectItem key="negative_balance_filter" value="negative_balance">Negative Balance</SelectItem>
                
                {/* Authentication Templates */}
                <SelectItem key="email_verification_filter" value="email_verification">Email Verification</SelectItem>
                
                {/* Account Management Templates */}
                <SelectItem key="account_activation_filter" value="account_activation">Account Activation</SelectItem>
                
                {/* Alert Templates */}
                <SelectItem key="high_cost_alert_filter" value="high_cost_alert">High Cost Alert</SelectItem>
                <SelectItem key="low_asr_alert_filter" value="low_asr_alert">Low ASR Alert</SelectItem>
                <SelectItem key="extreme_usage_alert_filter" value="extreme_usage_alert">Extreme Usage Alert</SelectItem>
                
                {/* Payment Notifications */}
                <SelectItem key="payment_success_gateway_filter" value="payment_success_gateway">Payment Success</SelectItem>
                <SelectItem key="payment_success_admin_filter" value="payment_success_admin">Admin Credit</SelectItem>
                
                {/* Password Reset */}
                <SelectItem key="password_reset_filter" value="password_reset">Password Reset</SelectItem>
                
                {/* Phone Number Notifications */}
                <SelectItem key="backorder_approved_filter" value="backorder_approved">Backorder Approved</SelectItem>
                <SelectItem key="backorder_rejected_filter" value="backorder_rejected">Backorder Rejected</SelectItem>
                <SelectItem key="cancellation_approved_filter" value="cancellation_approved">Cancellation Approved</SelectItem>
                <SelectItem key="cancellation_rejected_filter" value="cancellation_rejected">Cancellation Rejected</SelectItem>
                <SelectItem key="number_purchase_single_filter" value="number_purchase_single">Number Purchase (Single)</SelectItem>
                <SelectItem key="number_purchase_bulk_filter" value="number_purchase_bulk">Number Purchase (Bulk)</SelectItem>
                <SelectItem key="number_assignment_filter" value="number_assignment">Admin Assignment</SelectItem>
                
                {/* Ticket Notifications */}
                <SelectItem key="ticket_created_filter" value="ticket_created">Ticket Created</SelectItem>
                <SelectItem key="ticket_updated_filter" value="ticket_updated">Ticket Updated</SelectItem>
                <SelectItem key="ticket_resolved_filter" value="ticket_resolved">Ticket Resolved</SelectItem>
                <SelectItem key="ticket_assigned_filter" value="ticket_assigned">Ticket Assigned</SelectItem>
                <SelectItem key="ticket_replied_filter" value="ticket_replied">Ticket Replied</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search by user ID..."
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              className="w-full md:w-48"
            />

            <div className="flex space-x-2">
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
              <Button variant="outline" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="default" 
                onClick={handleManualCheck}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Check Balances
              </Button>
              <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <MailCheck className="h-4 w-4 mr-2" />
                    Test Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Send Test Email Notification</DialogTitle>
                    <DialogDescription>
                      Send a test email notification for either general notifications or ticket notifications.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    
                    {/* Category Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={testForm.testCategory} onValueChange={(value) => setTestForm(prev => ({ 
                        ...prev, 
                        testCategory: value,
                        notificationType: getDefaultNotificationType(value)
                      }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="balance" value="balance">Balance Notifications</SelectItem>
                          <SelectItem key="auth" value="auth">Authentication Templates</SelectItem>
                          <SelectItem key="account" value="account">Account Management Templates</SelectItem>
                          <SelectItem key="alerts" value="alerts">Alert Templates</SelectItem>
                          <SelectItem key="payment" value="payment">Payment Notifications</SelectItem>
                          <SelectItem key="phone_numbers" value="phone_numbers">Phone Number Notifications</SelectItem>
                          <SelectItem key="ticket" value="ticket">Ticket Notifications</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Balance Notifications */}
                    {testForm.testCategory === 'balance' && (
                      <React.Fragment key="balance-section">
                        <div className="space-y-2">
                          <Label htmlFor="user">User</Label>
                          <UserSelect
                            value={testForm.userId}
                            onValueChange={(value) => setTestForm(prev => ({ ...prev, userId: value }))}
                            users={users}
                            isLoading={isLoadingUsers}
                            categoryPrefix="balance"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Select value={testForm.notificationType} onValueChange={(value) => setTestForm(prev => ({ ...prev, notificationType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key="low_balance" value="low_balance">Low Balance</SelectItem>
                              <SelectItem key="zero_balance" value="zero_balance">Zero Balance</SelectItem>
                              <SelectItem key="negative_balance" value="negative_balance">Negative Balance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Show balance/threshold fields for balance notifications */}
                        <div className="space-y-2">
                          <Label htmlFor="balance">Test Balance</Label>
                          <Input
                            id="balance"
                            type="number"
                            step="0.01"
                            placeholder="Optional (auto-generated if empty)"
                            value={testForm.testBalance}
                            onChange={(e) => setTestForm(prev => ({ ...prev, testBalance: e.target.value }))}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="threshold">Test Threshold</Label>
                          <Input
                            id="threshold"
                            type="number"
                            step="0.01"
                            placeholder="Optional (auto-generated if empty)"
                            value={testForm.testThreshold}
                            onChange={(e) => setTestForm(prev => ({ ...prev, testThreshold: e.target.value }))}
                          />
                        </div>
                      </React.Fragment>
                    )}

                    {/* Authentication Templates */}
                    {testForm.testCategory === 'auth' && (
                      <React.Fragment key="auth-section">
                        <div className="space-y-2">
                          <Label htmlFor="user">User</Label>
                          <UserSelect
                            value={testForm.userId}
                            onValueChange={(value) => setTestForm(prev => ({ ...prev, userId: value }))}
                            users={users}
                            isLoading={isLoadingUsers}
                            categoryPrefix="auth"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Select value={testForm.notificationType} onValueChange={(value) => setTestForm(prev => ({ ...prev, notificationType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key="email_verification" value="email_verification">Email Verification</SelectItem>
                              <SelectItem key="password_reset" value="password_reset">Password Reset</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </React.Fragment>
                    )}

                    {/* Account Management Templates */}
                    {testForm.testCategory === 'account' && (
                      <React.Fragment key="account-section">
                        <div className="space-y-2">
                          <Label htmlFor="user">User</Label>
                          <UserSelect
                            value={testForm.userId}
                            onValueChange={(value) => setTestForm(prev => ({ ...prev, userId: value }))}
                            users={users}
                            isLoading={isLoadingUsers}
                            categoryPrefix="account"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Select value={testForm.notificationType} onValueChange={(value) => setTestForm(prev => ({ ...prev, notificationType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key="account_activation" value="account_activation">Account Activation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </React.Fragment>
                    )}

                    {/* Alert Templates */}
                    {testForm.testCategory === 'alerts' && (
                      <React.Fragment key="alerts-section">
                        <div className="space-y-2">
                          <Label htmlFor="user">User</Label>
                          <UserSelect
                            value={testForm.userId}
                            onValueChange={(value) => setTestForm(prev => ({ ...prev, userId: value }))}
                            users={users}
                            isLoading={isLoadingUsers}
                            categoryPrefix="alerts"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Select value={testForm.notificationType} onValueChange={(value) => setTestForm(prev => ({ ...prev, notificationType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key="high_cost_alert" value="high_cost_alert">High Cost Alert</SelectItem>
                              <SelectItem key="low_asr_alert" value="low_asr_alert">Low ASR Alert</SelectItem>
                              <SelectItem key="extreme_usage_alert" value="extreme_usage_alert">Extreme Usage Alert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </React.Fragment>
                    )}

                    {/* Payment Notifications */}
                    {testForm.testCategory === 'payment' && (
                      <React.Fragment key="payment-section">
                        <div className="space-y-2">
                          <Label htmlFor="user">User</Label>
                          <UserSelect
                            value={testForm.userId}
                            onValueChange={(value) => setTestForm(prev => ({ ...prev, userId: value }))}
                            users={users}
                            isLoading={isLoadingUsers}
                            categoryPrefix="payment"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Select value={testForm.notificationType} onValueChange={(value) => setTestForm(prev => ({ ...prev, notificationType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key="payment_success_gateway" value="payment_success_gateway">Payment Success</SelectItem>
                              <SelectItem key="payment_success_admin" value="payment_success_admin">Admin Credit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </React.Fragment>
                    )}

                    {/* Phone Number Notifications */}
                    {testForm.testCategory === 'phone_numbers' && (
                      <React.Fragment key="phone-numbers-section">
                        <div className="space-y-2">
                          <Label htmlFor="user">User</Label>
                          <UserSelect
                            value={testForm.userId}
                            onValueChange={(value) => setTestForm(prev => ({ ...prev, userId: value }))}
                            users={users}
                            isLoading={isLoadingUsers}
                            categoryPrefix="phone_numbers"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Select value={testForm.notificationType} onValueChange={(value) => setTestForm(prev => ({ ...prev, notificationType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key="backorder_approved" value="backorder_approved">Backorder Approved</SelectItem>
                              <SelectItem key="backorder_rejected" value="backorder_rejected">Backorder Rejected</SelectItem>
                              <SelectItem key="cancellation_approved" value="cancellation_approved">Cancellation Approved</SelectItem>
                              <SelectItem key="cancellation_rejected" value="cancellation_rejected">Cancellation Rejected</SelectItem>
                              <SelectItem key="number_purchase_single" value="number_purchase_single">Number Purchase (Single)</SelectItem>
                              <SelectItem key="number_purchase_bulk" value="number_purchase_bulk">Number Purchase (Bulk)</SelectItem>
                              <SelectItem key="number_assignment" value="number_assignment">Admin Assignment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sample Data Preview */}
                        <div className="bg-muted/30 rounded-lg p-3 border">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <TestTube className="h-4 w-4" />
                            Sample Test Data
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div key="phone-number" className="flex justify-between">
                              <span className="text-muted-foreground">Phone Number:</span>
                              <span className="font-mono">+1234567890</span>
                            </div>
                            <div key="country" className="flex justify-between">
                              <span className="text-muted-foreground">Country:</span>
                              <span>United States</span>
                            </div>
                            <div key="type" className="flex justify-between">
                              <span className="text-muted-foreground">Type:</span>
                              <span>Local</span>
                            </div>
                            <div key="monthly-rate" className="flex justify-between">
                              <span className="text-muted-foreground">Monthly Rate:</span>
                              <span>€3.50</span>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    )}

                    {/* Ticket Notifications */}
                    {testForm.testCategory === 'ticket' && (
                      <React.Fragment key="ticket-section">
                        <div className="space-y-2">
                          <Label htmlFor="user">User</Label>
                          <UserSelect
                            value={testForm.userId}
                            onValueChange={(value) => setTestForm(prev => ({ ...prev, userId: value }))}
                            users={users}
                            isLoading={isLoadingUsers}
                            categoryPrefix="ticket"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Select value={testForm.ticketNotificationType} onValueChange={(value) => setTestForm(prev => ({ ...prev, ticketNotificationType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem key="ticket_created" value="ticket_created">Ticket Created</SelectItem>
                              <SelectItem key="ticket_updated" value="ticket_updated">Ticket Updated</SelectItem>
                              <SelectItem key="ticket_resolved" value="ticket_resolved">Ticket Resolved</SelectItem>
                              <SelectItem key="ticket_assigned" value="ticket_assigned">Ticket Assigned</SelectItem>
                              <SelectItem key="ticket_replied" value="ticket_replied">Ticket Replied</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Include Customer Template</Label>
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Customer Email Template</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Also send customer template to selected user (tests both admin & customer views)
                              </p>
                            </div>
                            <Switch
                              checked={testForm.includeCustomerInTest}
                              onCheckedChange={(checked) => setTestForm(prev => ({ ...prev, includeCustomerInTest: checked }))}
                            />
                          </div>
                        </div>

                        {/* Sample Data Preview */}
                        <div className="bg-muted/30 rounded-lg p-3 border">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <TestTube className="h-4 w-4" />
                            Sample Test Data
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div key="ticket" className="flex justify-between">
                              <span className="text-muted-foreground">Ticket:</span>
                              <span className="font-mono">TKT-000001</span>
                            </div>
                            <div key="customer" className="flex justify-between">
                              <span className="text-muted-foreground">Customer:</span>
                              <span>John Smith (Acme Corp)</span>
                            </div>
                            <div key="service" className="flex justify-between">
                              <span className="text-muted-foreground">Service:</span>
                              <span>Technical Support</span>
                            </div>
                            <div key="priority" className="flex justify-between">
                              <span className="text-muted-foreground">Priority:</span>
                              <span>Medium</span>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsTestDialogOpen(false);
                        resetTestForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendTestEmail}
                      disabled={isSendingTest || 
                        (['balance', 'auth', 'account', 'alerts', 'payment', 'phone_numbers', 'ticket'].includes(testForm.testCategory) && !testForm.userId)
                      }
                    >
                      {isSendingTest ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Test Email
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {selectedLogs.size > 0 && (
                <Button 
                  variant="secondary" 
                  onClick={handleBulkResend}
                  disabled={isResending}
                >
                  {isResending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Resend Selected ({selectedLogs.size})
                </Button>
              )}
              {selectedLogs.size > 0 && (
                <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete Selected ({selectedLogs.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Notifications</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedLogs.size} notification{selectedLogs.size === 1 ? '' : 's'}? 
                        This action cannot be undone and will permanently remove the notification{selectedLogs.size === 1 ? '' : 's'} from the system.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete {selectedLogs.size} Notification{selectedLogs.size === 1 ? '' : 's'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Logs Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notification logs found
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All Header */}
              {logs.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={logs.length > 0 && selectedLogs.size === logs.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      {selectedLogs.size === 0 
                        ? 'Select all notifications'
                        : selectedLogs.size === logs.length
                        ? 'All notifications selected'
                        : `${selectedLogs.size} of ${logs.length} selected`
                      }
                    </span>
                  </div>
                  {selectedLogs.size > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedLogs(new Set())}
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>
              )}
              
              {/* Log Entries */}
              {logs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedLogs.has(log.id)}
                          onCheckedChange={(checked) => handleSelectLog(log.id, checked)}
                        />
                        {getStatusIcon(log.status)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{log.userName}</span>
                          <span className="text-sm text-muted-foreground">({log.userEmail})</span>
                          {getTypeBadge(log.notificationType)}
                          {getStatusBadge(log.status)}
                        </div>
                        
                        {/* Dynamic details based on notification type */}
                        <div className="text-sm text-muted-foreground">
                          {log.notificationType.includes('balance') && log.balanceAmount !== undefined && log.thresholdAmount !== undefined ? (
                            <>Balance: €{log.balanceAmount.toFixed(4)} | Threshold: €{log.thresholdAmount.toFixed(4)}</>
                          ) : null}
                          
                          {log.notificationType === 'email_verification' && log.otpCode ? (
                            <>OTP Code: {log.otpCode}</>
                          ) : null}
                          
                          {log.notificationType === 'account_activation' && log.activationData?.sippyAccountId ? (
                            <>Sippy Account ID: {log.activationData.sippyAccountId}</>
                          ) : null}
                          
                          {log.notificationType.includes('alert') && log.alertData ? (
                            <>Alert Data: {JSON.stringify(log.alertData).substring(0, 100)}...</>
                          ) : null}
                          
                          {(log.notificationType === 'payment_success_gateway' || log.notificationType === 'payment_success_admin') && log.paymentData ? (
                            <>
                              Amount: {new Intl.NumberFormat('en-US', { style: 'currency', currency: log.paymentData.currency }).format(log.paymentData.amount)}
                              {log.paymentData.paymentMethod ? ` | Method: ${log.paymentData.paymentMethod}` : ''}
                              {log.paymentData.transactionId ? ` | TX: ${log.paymentData.transactionId.substring(0, 12)}...` : ''}
                              {log.paymentData.processedBy ? ` | By: ${log.paymentData.processedBy}` : ''}
                            </>
                          ) : null}
                          
                          {log.sippyAccountId ? (
                            <> | Account: {log.sippyAccountId}</>
                          ) : null}
                        </div>
                        
                        <div className="text-sm">
                          <strong>Subject:</strong> {log.emailSubject}
                        </div>
                        {log.fromEmail && (
                          <div className="text-sm text-muted-foreground">
                            <strong>From:</strong> {log.fromEmail}
                          </div>
                        )}
                        {log.errorMessage && (
                          <div className="text-sm text-red-600">
                            <strong>Error:</strong> {log.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-sm text-muted-foreground">
                        <div>Created: {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}</div>
                        {log.sentAt && (
                          <div>Sent: {format(new Date(log.sentAt), 'dd/MM/yyyy HH:mm:ss')}</div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendSingle(log.id)}
                        disabled={isResending}
                        title="Resend this notification"
                      >
                        {isResending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog open={deleteConfirmOpen && logToDelete === log.id} onOpenChange={(open) => {
                        setDeleteConfirmOpen(open);
                        if (!open) setLogToDelete(null);
                      }}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLogToDelete(log.id)}
                            disabled={isDeleting}
                            title="Delete this notification"
                          >
                            {isDeleting && logToDelete === log.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this notification for {log.userName}? 
                              This action cannot be undone and will permanently remove the notification from the system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSingle(log.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Notification
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 