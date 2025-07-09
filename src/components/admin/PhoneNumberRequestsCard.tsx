'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  RefreshCw, 
  Phone, 
  ExternalLink,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  PhoneCall
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface PhoneNumberRequest {
  _id: string;
  requestNumber: string;
  requestType: 'cancel' | 'transfer' | 'suspend' | 'modify' | 'backorder';
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  description?: string;
  businessJustification?: string;
  createdAt: string;
  updatedAt: string;
  phoneNumber: {
    _id: string;
    number: string;
    country: string;
    numberType: string;
    status: string;
  };
  user: {
    _id: string;
    name: string;
    email: string;
    company?: string;
    onboarding?: {
      companyName?: string;
    };
  };
  reviewedAt?: string;
  processedAt?: string;
  daysOpen: number;
}

interface RequestStats {
  total: number;
  byStatus: {
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
    cancelled: number;
    expired: number;
  };
  byType: {
    cancel: number;
    transfer: number;
    suspend: number;
    modify: number;
    backorder: number;
  };
  byPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  oldestRequestDays: number;
  averageDaysOpen: number;
}

interface PhoneNumberRequestsCardProps {
  onRefresh?: () => void;
  limit?: number;
  isEditMode?: boolean;
}

export function PhoneNumberRequestsCard({ 
  onRefresh, 
  limit = 10,
  isEditMode = false
}: PhoneNumberRequestsCardProps) {
  const [requests, setRequests] = useState<PhoneNumberRequest[]>([]);
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhoneNumberRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch both regular phone number requests and backorder requests
      const [phoneNumberResponse, backorderResponse] = await Promise.all([
        fetch(`/api/admin/phone-numbers/requests?limit=${limit}&status=pending`),
        fetch(`/api/admin/backorder-requests?limit=${limit}&status=pending`)
      ]);
      
      if (!phoneNumberResponse.ok) {
        const errorData = await phoneNumberResponse.json();
        throw new Error(errorData.error || 'Failed to fetch phone number requests');
      }
      
      if (!backorderResponse.ok) {
        const errorData = await backorderResponse.json();
        throw new Error(errorData.error || 'Failed to fetch backorder requests');
      }
      
      const [phoneNumberData, backorderData] = await Promise.all([
        phoneNumberResponse.json(),
        backorderResponse.json()
      ]);
      
      // Transform regular phone number requests
      const transformedPhoneNumberRequests = (phoneNumberData.requests || []).map((request: PhoneNumberRequest) => {
        const now = new Date();
        const createdAt = new Date(request.createdAt);
        const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...request,
          daysOpen,
          user: {
            ...request.user,
            company: request.user.onboarding?.companyName || request.user.company
          }
        };
      });
      
      // Transform backorder requests to match the interface
      const transformedBackorderRequests = (backorderData.requests || []).map((request: any) => {
        const now = new Date();
        const createdAt = new Date(request.createdAt);
        const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          _id: request._id,
          requestNumber: request.requestNumber,
          requestType: 'backorder' as const,
          status: request.status,
          priority: request.priority,
          reason: request.reason || 'Backorder request',
          businessJustification: request.businessJustification,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          phoneNumber: request.phoneNumber || {
            _id: request.phoneNumberId || '',
            number: 'N/A',
            country: 'N/A',
            numberType: 'N/A',
            status: 'N/A'
          },
          user: {
            _id: request.user?._id || request.userId || '',
            name: request.user?.name || 'Unknown',
            email: request.user?.email || request.userEmail || '',
            company: request.user?.onboarding?.companyName || request.user?.company,
            onboarding: {
              companyName: request.user?.onboarding?.companyName || null
            }
          },
          reviewedAt: request.reviewedAt,
          processedAt: request.processedAt,
          daysOpen
        };
      });
      
      // Combine both types of requests
      const allRequests = [...transformedPhoneNumberRequests, ...transformedBackorderRequests];
      
      // Sort by creation date (most recent first)
      const transformedRequests = allRequests.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setRequests(transformedRequests);
      
      // Calculate stats
      const statsData: RequestStats = {
        total: transformedRequests.length,
        byStatus: {
          pending: transformedRequests.filter((r: PhoneNumberRequest) => r.status === 'pending').length,
          approved: transformedRequests.filter((r: PhoneNumberRequest) => r.status === 'approved').length,
          rejected: transformedRequests.filter((r: PhoneNumberRequest) => r.status === 'rejected').length,
          completed: transformedRequests.filter((r: PhoneNumberRequest) => r.status === 'completed').length,
          cancelled: transformedRequests.filter((r: PhoneNumberRequest) => r.status === 'cancelled').length,
          expired: transformedRequests.filter((r: PhoneNumberRequest) => r.status === 'expired').length,
        },
        byType: {
          cancel: transformedRequests.filter((r: PhoneNumberRequest) => r.requestType === 'cancel').length,
          transfer: transformedRequests.filter((r: PhoneNumberRequest) => r.requestType === 'transfer').length,
          suspend: transformedRequests.filter((r: PhoneNumberRequest) => r.requestType === 'suspend').length,
          modify: transformedRequests.filter((r: PhoneNumberRequest) => r.requestType === 'modify').length,
          backorder: transformedRequests.filter((r: PhoneNumberRequest) => r.requestType === 'backorder').length,
        },
        byPriority: {
          urgent: transformedRequests.filter((r: PhoneNumberRequest) => r.priority === 'urgent').length,
          high: transformedRequests.filter((r: PhoneNumberRequest) => r.priority === 'high').length,
          medium: transformedRequests.filter((r: PhoneNumberRequest) => r.priority === 'medium').length,
          low: transformedRequests.filter((r: PhoneNumberRequest) => r.priority === 'low').length,
        },
        oldestRequestDays: transformedRequests.length > 0 
          ? Math.max(...transformedRequests.map((r: PhoneNumberRequest) => r.daysOpen))
          : 0,
        averageDaysOpen: transformedRequests.length > 0
          ? Math.round(transformedRequests.reduce((sum: number, r: PhoneNumberRequest) => sum + r.daysOpen, 0) / transformedRequests.length)
          : 0,
      };
      
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching phone number requests:', error);
      setError(error instanceof Error ? error.message : 'Failed to load requests');
      toast.error('Failed to load phone number requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumberRequests();
  }, [limit]);

  const handleRefresh = () => {
    fetchPhoneNumberRequests();
    onRefresh?.();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'cancel': return <XCircle className="h-3 w-3 text-red-500" />;
      case 'transfer': return <PhoneCall className="h-3 w-3 text-blue-500" />;
      case 'suspend': return <Clock className="h-3 w-3 text-orange-500" />;
      case 'modify': return <AlertCircle className="h-3 w-3 text-purple-500" />;
      case 'backorder': return <Phone className="h-3 w-3 text-green-500" />;
      default: return <Phone className="h-3 w-3 text-gray-500" />;
    }
  };

  const getRequestTypeDisplayName = (type: string) => {
    switch (type) {
      case 'cancel': return 'Cancel';
      case 'transfer': return 'Transfer';
      case 'suspend': return 'Suspend';
      case 'modify': return 'Modify';
      case 'backorder': return 'Backorder';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const formatDaysAgo = (daysOpen: number) => {
    if (daysOpen === 0) return 'Today';
    if (daysOpen === 1) return '1 day ago';
    return `${daysOpen} days ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            <div className="w-32 h-4 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-6 h-6 bg-muted rounded animate-pulse" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
            <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="w-48 h-4 bg-muted rounded animate-pulse" />
              <div className="w-32 h-3 bg-muted rounded animate-pulse" />
            </div>
            <div className="w-16 h-6 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          Error Loading Requests
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
            All Caught Up!
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            No pending phone number requests at the moment.
          </p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Phone className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">
            {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </span>
          {stats && stats.averageDaysOpen > 0 && (
            <Badge variant="outline" className="text-xs">
              Avg {stats.averageDaysOpen} day{stats.averageDaysOpen !== 1 ? 's' : ''} open
            </Badge>
          )}
        </div>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Stats */}
      {stats && isEditMode && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg border-2 border-dashed border-primary/20">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{stats.byPriority.urgent + stats.byPriority.high}</div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{stats.oldestRequestDays}</div>
            <div className="text-xs text-muted-foreground">Oldest (days)</div>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {requests.map((request, index) => (
          <div key={request._id}>
            <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-2">
              {/* Header Row: Request Info and Priority */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded font-semibold">
                    {request.requestNumber}
                  </code>
                  <div className="flex items-center space-x-1.5">
                    {getRequestTypeIcon(request.requestType)}
                    <span className="text-sm font-medium">
                      {getRequestTypeDisplayName(request.requestType)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={getPriorityBadgeVariant(request.priority)} 
                    className="text-xs font-semibold"
                  >
                    {request.priority.toUpperCase()}
                  </Badge>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDaysAgo(request.daysOpen)}</span>
                  </div>
                </div>
              </div>

              {/* Phone Number and Details Row */}
              <div className="flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3 w-3 text-blue-500" />
                    <span className="text-sm font-mono font-semibold">{request.phoneNumber.number}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {request.phoneNumber.country} • {request.phoneNumber.numberType}
                  </Badge>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>•</span>
                    <span className="truncate" title={request.reason}>{request.reason}</span>
                  </div>
                </div>
                <Link href={`/admin/phone-number-requests`} passHref>
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-shrink-0">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </Link>
              </div>

              {/* User Information Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getInitials(request.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {request.user.name}
                    </p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      {request.user.email}
                    </p>
                    {request.user.company && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <Badge variant="secondary" className="text-xs">
                          {request.user.company}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                {request.businessJustification && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground italic truncate max-w-48" title={request.businessJustification}>
                      {request.businessJustification}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {index < requests.length - 1 && <Separator className="my-2" />}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      {requests.length > 0 && stats && (
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {requests.length} pending request{requests.length !== 1 ? 's' : ''}
            </span>
            <span>
              {stats.byPriority.urgent} urgent, {stats.byPriority.high} high priority
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 