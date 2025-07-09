'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  RefreshCw, 
  DollarSign,
  X,
  Filter,
  Eye,
  CreditCard,
  Receipt,
  CheckCircle,
  XCircle,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { useBranding } from '@/hooks/useBranding';

interface MongoPayment {
  _id: string;
  paymentIntentId: string;
  userId: string;
  userEmail: string;
  sippyAccountId: number;
  topupAmount: number;
  processingFee: number;
  fixedFee: number;
  totalChargedAmount: number;
  currency: string;
  provider: string;
  gatewayName: string;
  paymentMethodType: string;
  cardBrand?: string;
  cardLast4?: string;
  cardCountry?: string;
  status: string;
  paymentIntentStatus: string;
  failureCode?: string;
  failureMessage?: string;
  paymentInitiatedAt: string;
  paymentCompletedAt?: string;
  paymentReference?: string;
  description?: string;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentStats {
  totalPayments: number;
  successfulPayments: number;
  totalTopupAmount: number;
  totalFeesCollected: number;
  totalChargedAmount: number;
  averagePaymentAmount: number;
  currencies: string[];
}

interface PaymentFilters {
  status: string;
  provider: string;
  startDate: string;
  endDate: string;
  userEmail: string;
  accountId: string;
}

interface PaymentHistoryResponse {
  success: boolean;
  payments: MongoPayment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  statistics: PaymentStats;
  filters: PaymentFilters;
}

export function PaymentManagement() {
  const { user } = useAuth();
  const { colors } = useBranding();
  const [payments, setPayments] = useState<MongoPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 50;
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    provider: 'all',
    startDate: '',
    endDate: '',
    userEmail: '',
    accountId: '',
  });

  // Selected payment for details
  const [selectedPayment, setSelectedPayment] = useState<MongoPayment | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const fetchPayments = async (page: number = currentPage) => {
    if (user?.role !== 'admin') {
      setError('Access denied - Admin only');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        limit: recordsPerPage.toString(),
        offset: ((page - 1) * recordsPerPage).toString(),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
        ...(filters.accountId && { account_id: filters.accountId }),
      });

      const response = await fetch(`/api/payments/history?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      const data: PaymentHistoryResponse = await response.json();
      
      setPayments(data.payments);
      setStats(data.statistics);
      setTotalRecords(data.pagination.total);
      
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payments');
      toast.error('Failed to fetch payment history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1);
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      provider: 'all',
      startDate: '',
      endDate: '',
      userEmail: '',
      accountId: '',
    });
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchPayments(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchPayments(newPage);
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800">Succeeded</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  if (user?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700">Access Denied</h3>
          <p className="text-muted-foreground">This page is restricted to administrators only.</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>Failed to load payment management</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button onClick={() => fetchPayments()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>
          Payment Management
        </h1>
        <p className="text-muted-foreground">
          Manage MongoDB payment records and view detailed analytics
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                    {stats.totalPayments}
                  </p>
                </div>
                <Receipt className="h-8 w-8" style={{ color: `${colors.primary}60` }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.totalPayments > 0 ? Math.round((stats.successfulPayments / stats.totalPayments) * 100) : 0}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Volume</p>
                  <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                    {formatCurrency(stats.totalChargedAmount, stats.currencies[0] || 'EUR')}
                  </p>
                </div>
                <DollarSign className="h-8 w-8" style={{ color: `${colors.primary}60` }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fees Collected</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(stats.totalFeesCollected, stats.currencies[0] || 'EUR')}
                  </p>
                </div>
                <Building className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchPayments()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {totalRecords} total payments
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filters</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowFilters(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="succeeded">Succeeded</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Account ID</Label>
                <Input
                  type="number"
                  placeholder="Sippy Account ID"
                  value={filters.accountId}
                  onChange={(e) => handleFilterChange('accountId', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <div className="flex gap-2">
                  <Button onClick={applyFilters} size="sm" style={{ backgroundColor: colors.primary }}>
                    Apply
                  </Button>
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {isLoading ? (
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: colors.primary }} />
            <p>Loading payment records...</p>
          </CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No Payment Records Found</h3>
            <p className="text-muted-foreground">No MongoDB payment records match your criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.createdAt), 'HH:mm:ss')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.userEmail}</div>
                          <div className="text-xs text-muted-foreground">ID: {payment.userId.slice(-8)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{payment.sippyAccountId}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-bold text-green-600">
                            {formatCurrency(payment.totalChargedAmount, payment.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Top-up: {formatCurrency(payment.topupAmount, payment.currency)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.cardBrand && payment.cardLast4 ? (
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <span className="capitalize">{payment.cardBrand} •••• {payment.cardLast4}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="capitalize">{payment.provider}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowPaymentDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            <div className="border-t p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * recordsPerPage + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} payments
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Complete payment information from MongoDB records
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Intent ID</Label>
                  <div className="font-mono text-sm">{selectedPayment.paymentIntentId}</div>
                </div>
                <div>
                  <Label>Payment Reference</Label>
                  <div className="font-mono text-sm">{selectedPayment.paymentReference || 'N/A'}</div>
                </div>
                <div>
                  <Label>User Email</Label>
                  <div>{selectedPayment.userEmail}</div>
                </div>
                <div>
                  <Label>Sippy Account ID</Label>
                  <div>{selectedPayment.sippyAccountId}</div>
                </div>
              </div>

              {/* Amounts */}
              <div>
                <Label>Amount Breakdown</Label>
                <div className="mt-2 p-4 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Top-up Amount:</span>
                      <span className="font-medium">{formatCurrency(selectedPayment.topupAmount, selectedPayment.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Fee:</span>
                      <span className="font-medium">{formatCurrency(selectedPayment.processingFee, selectedPayment.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fixed Fee:</span>
                      <span className="font-medium">{formatCurrency(selectedPayment.fixedFee, selectedPayment.currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Total Charged:</span>
                      <span>{formatCurrency(selectedPayment.totalChargedAmount, selectedPayment.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Info */}
              {selectedPayment.cardBrand && (
                <div>
                  <Label>Payment Method</Label>
                  <div className="mt-2 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-4">
                      <CreditCard className="h-8 w-8" />
                      <div>
                        <div className="font-medium capitalize">
                          {selectedPayment.cardBrand} •••• {selectedPayment.cardLast4}
                        </div>
                        {selectedPayment.cardCountry && (
                          <div className="text-sm text-muted-foreground">
                            Issued in {selectedPayment.cardCountry}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status and Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                </div>
                <div>
                  <Label>Gateway</Label>
                  <div>{selectedPayment.gatewayName} ({selectedPayment.provider})</div>
                </div>
                <div>
                  <Label>Created At</Label>
                  <div>{format(new Date(selectedPayment.createdAt), 'MMM dd, yyyy HH:mm:ss')}</div>
                </div>
                {selectedPayment.paymentCompletedAt && (
                  <div>
                    <Label>Completed At</Label>
                    <div>{format(new Date(selectedPayment.paymentCompletedAt), 'MMM dd, yyyy HH:mm:ss')}</div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {(selectedPayment.description || selectedPayment.notes) && (
                <div>
                  <Label>Notes</Label>
                  <div className="mt-2 p-4 bg-muted/30 rounded-lg text-sm">
                    {selectedPayment.description && (
                      <div className="mb-2">
                        <strong>Description:</strong> {selectedPayment.description}
                      </div>
                    )}
                    {selectedPayment.notes && (
                      <div>
                        <strong>Notes:</strong> {selectedPayment.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedPayment.receiptUrl && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open(selectedPayment.receiptUrl, '_blank')}
                    variant="outline"
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    View Receipt
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 