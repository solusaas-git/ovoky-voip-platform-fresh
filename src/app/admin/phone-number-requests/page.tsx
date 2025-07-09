'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '@/lib/i18n';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { formatDate } from '@/lib/utils';
import { PhoneNumberRequest, BackorderRequest } from '@/types/phoneNumber';

interface CombinedRequestPhoneNumber {
  _id: string;
  number: string;
  country?: string;
  status?: string;
}

interface CombinedRequestUser {
  _id: string;
  name?: string;
  email: string;
  company?: string;
  onboarding?: {
    companyName?: string;
  };
}

interface CombinedRequest {
  _id: string;
  requestNumber: string;
  phoneNumber?: CombinedRequestPhoneNumber;
  user?: CombinedRequestUser;
  status: string;
  priority: string;
  reason?: string;
  description?: string;
  businessJustification?: string;
  requestType: 'cancellation' | 'backorder' | 'transfer' | 'suspend' | 'modify';
  originalType?: string; // The original request type from PhoneNumberRequest
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  processedAt?: string;
  expiresAt?: string;
  scheduledDate?: string;
  reviewNotes?: string;
  processingNotes?: string;
  reviewedBy?: string;
}

interface CombinedFilters {
  search?: string;
  status?: string;
  requestType?: 'cancellation' | 'backorder' | 'transfer' | 'suspend' | 'modify';
  priority?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export default function AdminPhoneNumberRequestsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslations();
  const [requests, setRequests] = useState<CombinedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CombinedRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<CombinedFilters>({
    search: '',
    status: undefined,
    requestType: undefined,
    priority: undefined,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Form states
  const [reviewNotes, setReviewNotes] = useState('');
  const [processingNotes, setProcessingNotes] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Build query parameters for both APIs
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      // Fetch both types of requests in parallel
      const [phoneNumberRequestsResponse, backorderRequestsResponse] = await Promise.all([
        fetch(`/api/admin/phone-numbers/requests?${params}`).then(res => res.ok ? res.json() : { requests: [], total: 0 }),
        fetch(`/api/admin/backorder-requests?${params}`).then(res => res.ok ? res.json() : { requests: [], total: 0 })
      ]);

      // Combine and transform the requests
      const combinedRequests: CombinedRequest[] = [];
      
      // Add phone number requests (cancellation, transfer, etc.)
      if (phoneNumberRequestsResponse.requests) {
        phoneNumberRequestsResponse.requests.forEach((req: PhoneNumberRequest) => {
          // Filter by request type if specified
          if (filters.requestType && filters.requestType !== 'cancellation' && filters.requestType !== req.requestType) {
            return;
          }
          
          combinedRequests.push({
            _id: req._id,
            requestNumber: req.requestNumber,
            phoneNumber: req.phoneNumber,
            user: req.user,
            status: req.status,
            priority: req.priority,
            reason: req.reason,
            description: req.description,
            requestType: req.requestType === 'cancel' ? 'cancellation' : (req.requestType as 'transfer' | 'suspend' | 'modify'),
            originalType: req.requestType,
            createdAt: req.createdAt,
            updatedAt: req.updatedAt,
            reviewedAt: req.reviewedAt,
            processedAt: req.processedAt
          });
        });
      }
      
      // Add backorder requests (purchase requests)
      if (backorderRequestsResponse.requests) {
        backorderRequestsResponse.requests.forEach((req: BackorderRequest) => {
          // Filter by request type if specified
          if (filters.requestType && filters.requestType !== 'backorder') {
            return;
          }
          
          combinedRequests.push({
            _id: req._id,
            requestNumber: req.requestNumber,
            phoneNumber: req.phoneNumber,
            user: req.user,
            status: req.status,
            priority: req.priority,
            reason: req.reason,
            businessJustification: req.businessJustification,
            requestType: 'backorder',
            createdAt: req.createdAt,
            updatedAt: req.updatedAt,
            reviewedAt: req.reviewedAt,
            processedAt: req.processedAt,
            expiresAt: req.expiresAt
          });
        });
      }
      
      // Sort combined requests
      combinedRequests.sort((a, b) => {
        const aValue = filters.sortBy === 'createdAt' ? new Date(a.createdAt).getTime() : a[filters.sortBy as keyof CombinedRequest] as string;
        const bValue = filters.sortBy === 'createdAt' ? new Date(b.createdAt).getTime() : b[filters.sortBy as keyof CombinedRequest] as string;
        
        if (filters.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      // Apply pagination
      const startIndex = (filters.page! - 1) * filters.limit!;
      const endIndex = startIndex + filters.limit!;
      const paginatedRequests = combinedRequests.slice(startIndex, endIndex);
      
      setRequests(paginatedRequests);
      setTotal(combinedRequests.length);
      setCurrentPage(filters.page!);
      setTotalPages(Math.ceil(combinedRequests.length / filters.limit!));
      
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error(t('adminPhoneRequests.messages.fetchError'));
      setRequests([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRequests();
  }, [filters, fetchRequests]);

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    try {
      setIsSubmitting(true);
      
      // Use the appropriate API endpoint based on request type
      const apiUrl = selectedRequest.requestType === 'backorder' 
        ? '/api/admin/backorder-requests'
        : '/api/admin/phone-numbers/requests';
      
      // Prepare request body based on API requirements
      const requestBody = selectedRequest.requestType === 'backorder' 
        ? {
            requestId: selectedRequest._id,
            status: 'approved',
            reviewNotes,
            processingNotes
          }
        : {
            requestId: selectedRequest._id,
            action: 'approve',
            reviewNotes,
            processingNotes
          };
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve request');
      }

      toast.success(t('adminPhoneRequests.messages.approveSuccess'));
      setShowApproveModal(false);
      setReviewNotes('');
      setProcessingNotes('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error instanceof Error ? error.message : t('adminPhoneRequests.messages.approveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      setIsSubmitting(true);
      
      // Use the appropriate API endpoint based on request type
      const apiUrl = selectedRequest.requestType === 'backorder' 
        ? '/api/admin/backorder-requests'
        : '/api/admin/phone-numbers/requests';
      
      // Prepare request body based on API requirements
      const requestBody = selectedRequest.requestType === 'backorder' 
        ? {
            requestId: selectedRequest._id,
            status: 'rejected',
            reviewNotes
          }
        : {
            requestId: selectedRequest._id,
            action: 'reject',
            reviewNotes
          };
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject request');
      }

      toast.success(t('adminPhoneRequests.messages.rejectSuccess'));
      setShowRejectModal(false);
      setReviewNotes('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error instanceof Error ? error.message : t('adminPhoneRequests.messages.rejectError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFilters = (newFilters: Partial<CombinedFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const changePage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getRequestTypeLabel = (requestType: string) => {
    switch (requestType) {
      case 'backorder': return t('adminPhoneRequests.requestTypes.backorder');
      case 'cancellation': return t('adminPhoneRequests.requestTypes.cancellation');
      case 'transfer': return t('adminPhoneRequests.requestTypes.transfer');
      case 'suspend': return t('adminPhoneRequests.requestTypes.suspend');
      case 'modify': return t('adminPhoneRequests.requestTypes.modify');
      default: return requestType;
    }
  };

  const getRequestTypeBadgeVariant = (requestType: string) => {
    switch (requestType) {
      case 'backorder': return 'default'; // blue
      case 'cancellation': return 'destructive'; // red
      case 'transfer': return 'secondary'; // gray
      case 'suspend': return 'outline'; // transparent
      case 'modify': return 'secondary'; // gray
      default: return 'outline';
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'approved': return 'secondary';
      case 'rejected': return 'destructive';
      case 'completed': return 'default';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Show loading spinner while auth is loading
  if (isAuthLoading) {
    return (
      <MainLayout>
        <PageLayout
          title={t('adminPhoneRequests.loading.title')}
          description={t('adminPhoneRequests.loading.description')}
          breadcrumbs={[
            { label: t('adminPhoneRequests.page.breadcrumbs.dashboard'), href: '/dashboard' },
            { label: t('adminPhoneRequests.page.breadcrumbs.admin'), href: '/admin' },
            { label: t('adminPhoneRequests.page.breadcrumbs.phoneNumberRequests') }
          ]}
        >
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </PageLayout>
      </MainLayout>
    );
  }

  // Verify admin access only after auth is loaded
  if (user?.role !== 'admin') {
    return (
      <MainLayout>
        <PageLayout
          title={t('adminPhoneRequests.access.denied')}
          description={t('adminPhoneRequests.access.deniedDescription')}
          breadcrumbs={[
            { label: t('adminPhoneRequests.page.breadcrumbs.dashboard'), href: '/dashboard' },
            { label: t('adminPhoneRequests.page.breadcrumbs.phoneNumberRequests') }
          ]}
        >
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('adminPhoneRequests.access.deniedMessage')}
            </AlertDescription>
          </Alert>
        </PageLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageLayout
        title={t('adminPhoneRequests.page.title')}
        description={t('adminPhoneRequests.page.description')}
        breadcrumbs={[
          { label: t('adminPhoneRequests.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('adminPhoneRequests.page.breadcrumbs.admin'), href: '/admin' },
          { label: t('adminPhoneRequests.page.breadcrumbs.phoneNumberRequests') }
        ]}
      >
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('adminPhoneRequests.filters.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t('adminPhoneRequests.filters.search')}
                  value={filters.search || ''}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
              
              <Select value={filters.status || 'all'} onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('adminPhoneRequests.filters.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('adminPhoneRequests.filters.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('adminPhoneRequests.status.pending')}</SelectItem>
                  <SelectItem value="approved">{t('adminPhoneRequests.status.approved')}</SelectItem>
                  <SelectItem value="rejected">{t('adminPhoneRequests.status.rejected')}</SelectItem>
                  <SelectItem value="completed">{t('adminPhoneRequests.status.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('adminPhoneRequests.status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.requestType || 'all'} onValueChange={(value) => updateFilters({ requestType: value === 'all' ? undefined : (value as 'cancellation' | 'backorder' | 'transfer' | 'suspend' | 'modify') })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('adminPhoneRequests.filters.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('adminPhoneRequests.filters.allTypes')}</SelectItem>
                  <SelectItem value="backorder">{t('adminPhoneRequests.requestTypes.purchaseRequests')}</SelectItem>
                  <SelectItem value="cancellation">{t('adminPhoneRequests.requestTypes.cancellations')}</SelectItem>
                  <SelectItem value="transfer">{t('adminPhoneRequests.requestTypes.transfers')}</SelectItem>
                  <SelectItem value="suspend">{t('adminPhoneRequests.requestTypes.suspensions')}</SelectItem>
                  <SelectItem value="modify">{t('adminPhoneRequests.requestTypes.modifications')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.priority || 'all'} onValueChange={(value) => updateFilters({ priority: value === 'all' ? undefined : value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('adminPhoneRequests.filters.allPriorities')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('adminPhoneRequests.filters.allPriorities')}</SelectItem>
                  <SelectItem value="urgent">{t('adminPhoneRequests.priority.urgent')}</SelectItem>
                  <SelectItem value="high">{t('adminPhoneRequests.priority.high')}</SelectItem>
                  <SelectItem value="medium">{t('adminPhoneRequests.priority.medium')}</SelectItem>
                  <SelectItem value="low">{t('adminPhoneRequests.priority.low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground">{t('adminPhoneRequests.stats.totalRequests')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {requests.filter(r => r.requestType === 'backorder').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('adminPhoneRequests.stats.purchaseRequests')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {requests.filter(r => r.requestType === 'cancellation').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('adminPhoneRequests.stats.cancellations')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {requests.filter(r => r.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('adminPhoneRequests.stats.pending')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {requests.filter(r => r.status === 'approved' || r.status === 'completed').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('adminPhoneRequests.stats.approved')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {requests.filter(r => r.priority === 'urgent' || r.priority === 'high').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('adminPhoneRequests.stats.highPriority')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('adminPhoneRequests.table.title')} ({total})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('adminPhoneRequests.table.headers.requestNumber')}</TableHead>
                      <TableHead>{t('adminPhoneRequests.table.headers.phoneNumber')}</TableHead>
                      <TableHead>{t('adminPhoneRequests.table.headers.user')}</TableHead>
                      <TableHead>{t('adminPhoneRequests.table.headers.type')}</TableHead>
                      <TableHead>{t('adminPhoneRequests.table.headers.status')}</TableHead>
                      <TableHead>{t('adminPhoneRequests.table.headers.priority')}</TableHead>
                      <TableHead>{t('adminPhoneRequests.table.headers.created')}</TableHead>
                      <TableHead>{t('adminPhoneRequests.table.headers.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell className="font-mono">{request.requestNumber}</TableCell>
                        <TableCell className="font-mono">{request.phoneNumber?.number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.user?.name || request.user?.email}</p>
                            <p className="text-xs text-muted-foreground">{request.user?.onboarding?.companyName || request.user?.company || t('adminPhoneRequests.table.noCompany')}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRequestTypeBadgeVariant(request.requestType)} className="flex items-center space-x-1 w-fit">
                            <span>{getRequestTypeLabel(request.requestType)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(request.status)} className="flex items-center space-x-1 w-fit">
                            <span>{getStatusIcon(request.status)}</span>
                            <span>{t(`adminPhoneRequests.status.${request.status}`)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(request.priority)}>
                            {t(`adminPhoneRequests.priority.${request.priority}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDetailsModal(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowApproveModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowRejectModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                      {t('adminPhoneRequests.table.pagination.showing')} {((currentPage - 1) * filters.limit!) + 1} {t('adminPhoneRequests.table.pagination.to')} {Math.min(currentPage * filters.limit!, total)} {t('adminPhoneRequests.table.pagination.of')} {total} {t('adminPhoneRequests.table.pagination.results')}
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {t('adminPhoneRequests.table.pagination.previous')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        {t('adminPhoneRequests.table.pagination.next')}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('adminPhoneRequests.modals.details.title')}</DialogTitle>
              <DialogDescription>
                {t('adminPhoneRequests.modals.details.description')} {selectedRequest?.requestNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.requestNumber')}</Label>
                    <p className="font-mono">{selectedRequest.requestNumber}</p>
                  </div>
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.status')}</Label>
                    <Badge variant={getBadgeVariant(selectedRequest.status)} className="flex items-center space-x-1 w-fit">
                      <span>{getStatusIcon(selectedRequest.status)}</span>
                      <span>{t(`adminPhoneRequests.status.${selectedRequest.status}`)}</span>
                    </Badge>
                  </div>
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.phoneNumber')}</Label>
                    <p className="font-mono">{selectedRequest.phoneNumber?.number}</p>
                  </div>
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.requestType')}</Label>
                    <p>{getRequestTypeLabel(selectedRequest.requestType)}</p>
                  </div>
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.priority')}</Label>
                    <Badge variant={getPriorityBadgeVariant(selectedRequest.priority)}>
                      {t(`adminPhoneRequests.priority.${selectedRequest.priority}`)}
                    </Badge>
                  </div>
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.created')}</Label>
                    <p>{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <Label>{t('adminPhoneRequests.modals.details.fields.user')}</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="font-medium">{selectedRequest.user?.name || selectedRequest.user?.email}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.user?.onboarding?.companyName || selectedRequest.user?.company || t('adminPhoneRequests.modals.details.noCompany')}</p>
                    <p className="text-xs text-muted-foreground">{selectedRequest.user?.email}</p>
                  </div>
                </div>

                <div>
                  <Label>{t('adminPhoneRequests.modals.details.fields.reason')}</Label>
                  <p className="text-sm">{selectedRequest.reason}</p>
                </div>

                {selectedRequest.requestType === 'backorder' && selectedRequest.businessJustification && (
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.businessJustification')}</Label>
                    <p className="text-sm">{selectedRequest.businessJustification}</p>
                  </div>
                )}

                {selectedRequest.requestType !== 'backorder' && selectedRequest.description && (
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.description')}</Label>
                    <p className="text-sm">{selectedRequest.description}</p>
                  </div>
                )}

                {selectedRequest.requestType === 'backorder' && selectedRequest.expiresAt && (
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.expiresAt')}</Label>
                    <p className="text-sm">{formatDate(selectedRequest.expiresAt)}</p>
                  </div>
                )}

                {selectedRequest.requestType !== 'backorder' && selectedRequest.scheduledDate && (
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.scheduledDate')}</Label>
                    <p className="text-sm">{formatDate(selectedRequest.scheduledDate)}</p>
                  </div>
                )}

                {selectedRequest.reviewNotes && (
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.reviewNotes')}</Label>
                    <p className="text-sm">{selectedRequest.reviewNotes}</p>
                  </div>
                )}

                {selectedRequest.processingNotes && (
                  <div>
                    <Label>{t('adminPhoneRequests.modals.details.fields.processingNotes')}</Label>
                    <p className="text-sm">{selectedRequest.processingNotes}</p>
                  </div>
                )}

                {selectedRequest.reviewedBy && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('adminPhoneRequests.modals.details.fields.reviewedBy')}</Label>
                      <p className="text-sm">{selectedRequest.reviewedBy}</p>
                    </div>
                    <div>
                      <Label>{t('adminPhoneRequests.modals.details.fields.reviewedAt')}</Label>
                      <p className="text-sm">{selectedRequest.reviewedAt ? formatDate(selectedRequest.reviewedAt) : t('adminPhoneRequests.modals.details.notAvailable')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Request Modal */}
        <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('adminPhoneRequests.modals.approve.title')}</DialogTitle>
              <DialogDescription>
                {selectedRequest?.requestType === 'backorder' 
                  ? `${t('adminPhoneRequests.modals.approve.descriptionPurchase')} ${selectedRequest?.phoneNumber?.number}`
                  : t('adminPhoneRequests.modals.approve.descriptionOther', { type: getRequestTypeLabel(selectedRequest?.requestType || '') }) + ` ${selectedRequest?.phoneNumber?.number}`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {selectedRequest?.requestType === 'backorder' 
                    ? t('adminPhoneRequests.modals.approve.warningPurchase')
                    : t('adminPhoneRequests.modals.approve.warningOther')
                  }
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="reviewNotes">{t('adminPhoneRequests.modals.approve.reviewNotes')}</Label>
                <Textarea
                  id="reviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t('adminPhoneRequests.modals.approve.reviewNotesPlaceholder')}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="processingNotes">{t('adminPhoneRequests.modals.approve.processingNotes')}</Label>
                <Textarea
                  id="processingNotes"
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                  placeholder={t('adminPhoneRequests.modals.approve.processingNotesPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowApproveModal(false)}>
                {t('adminPhoneRequests.modals.approve.cancel')}
              </Button>
              <Button
                onClick={handleApproveRequest}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('adminPhoneRequests.modals.approve.approving')}
                  </>
                ) : (
                  t('adminPhoneRequests.modals.approve.approve')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Request Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('adminPhoneRequests.modals.reject.title')}</DialogTitle>
              <DialogDescription>
                {selectedRequest?.requestType === 'backorder' 
                  ? `${t('adminPhoneRequests.modals.reject.descriptionPurchase')} ${selectedRequest?.phoneNumber?.number}`
                  : t('adminPhoneRequests.modals.reject.descriptionOther', { type: getRequestTypeLabel(selectedRequest?.requestType || '') }) + ` ${selectedRequest?.phoneNumber?.number}`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejectReviewNotes">{t('adminPhoneRequests.modals.reject.reviewNotes')}</Label>
                <Textarea
                  id="rejectReviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t('adminPhoneRequests.modals.reject.reviewNotesPlaceholder')}
                  rows={4}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                {t('adminPhoneRequests.modals.reject.cancel')}
              </Button>
              <Button
                onClick={handleRejectRequest}
                disabled={isSubmitting || !reviewNotes.trim()}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('adminPhoneRequests.modals.reject.rejecting')}
                  </>
                ) : (
                  t('adminPhoneRequests.modals.reject.reject')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </MainLayout>
  );
} 