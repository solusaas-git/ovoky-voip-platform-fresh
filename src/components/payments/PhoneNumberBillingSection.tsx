'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ChevronLeft,
  ChevronRight,
  Eye,
  Info, 
  Loader2,
  Phone,
  Receipt, 
  RefreshCw,
  X,
  XCircle,
  Zap,
  ArrowDown
} from 'lucide-react';

import { toast } from 'sonner';
import { format } from 'date-fns';

interface PhoneNumberBilling {
  _id: string;
  phoneNumberId: string;
  phoneNumber: {
    _id: string;
    number: string;
    numberType: string;
    monthlyRate: number;
    currency: string;
    country: string;
    countryCode: string;
  };
  userId: string;
  user: {
    _id: string;
    name: string;
    email: string;
    company?: string;
    onboarding?: {
      companyName?: string;
    };
  };
  assignmentId: string;
  assignment: {
    _id: string;
    assignedAt: string;
    unassignedAt?: string;
  };
  billingPeriodStart: string;
  billingPeriodEnd: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  billingDate: string;
  paidDate?: string;
  failureReason?: string;
  transactionType: 'monthly_fee' | 'setup_fee' | 'prorated_fee' | 'refund';
  sippyTransactionId?: string;
  processedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PhoneNumberBillingsResponse {
  billings: PhoneNumberBilling[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PhoneNumberBillingSectionProps {
  isAdmin: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export function PhoneNumberBillingSection({ isAdmin, colors }: PhoneNumberBillingSectionProps) {
  const [billingsData, setBillingsData] = useState<PhoneNumberBillingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSection, setShowSection] = useState(false);
  
  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: 'all',
    transactionType: 'all',
    userId: 'all',
    startDate: '',
    endDate: '',
  });

  // Process billing state
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<PhoneNumberBilling | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchBillings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy: 'createdAt', // Sort by operation date (when the billing record was created)
        sortOrder: 'desc', // Most recent first
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.transactionType !== 'all' && { transactionType: filters.transactionType }),
        ...(filters.userId !== 'all' && { userId: filters.userId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/phone-numbers/billing?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch phone number billings');
      }

      const data = await response.json();
      setBillingsData(data);
    } catch (error) {
      console.error('Error fetching phone number billings:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const processBilling = async (billingId: string) => {
    try {
      setIsProcessing(true);

      const response = await fetch('/api/phone-numbers/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process billing');
      }

      toast.success('Billing processed successfully');
      setShowProcessDialog(false);
      setSelectedBilling(null);
      
      // Add a small delay to ensure database is updated, then refresh
      setTimeout(() => {
        fetchBillings();
      }, 1000);
      
    } catch (error) {
      console.error('Error processing billing:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process billing');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-refresh effect when section becomes visible
  useEffect(() => {
    if (showSection) {
      fetchBillings();
    }
  }, [showSection]);

  // Auto-refresh every 60 seconds when section is visible to catch changes
  useEffect(() => {
    if (!showSection) return;
    
    const interval = setInterval(() => {
      fetchBillings();
    }, 60000); // Refresh every 60 seconds
    
    return () => clearInterval(interval);
  }, [showSection]);

  useEffect(() => {
    fetchBillings();
  }, [currentPage, filters]);

  useEffect(() => {
    if (isAdmin) {
      fetchBillings();
    }
  }, [isAdmin]);

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'monthly_fee':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Monthly Fee</Badge>;
      case 'setup_fee':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Setup Fee</Badge>;
      case 'prorated_fee':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Prorated Fee</Badge>;
      case 'refund':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Refund</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <>
      {/* Phone Number Billing Toggle Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <Phone className="h-5 w-5" style={{ color: colors.primary }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: colors.primary }}>
                  Phone Number Billing Traceability
                </h3>
                <p className="text-sm text-muted-foreground">
                  Track phone number charges and billing history with Sippy integration
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowSection(!showSection)}
              variant="outline"
              className="gap-2"
              style={{ 
                borderColor: colors.primary,
                color: colors.primary 
              }}
            >
              {showSection ? (
                <>
                  <X className="h-4 w-4" />
                  Hide Billing
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show Billing
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Phone Number Billing Section */}
      {showSection && (
        <Card className="border-0 shadow-xl rounded-xl overflow-hidden">
          <div 
            className="h-2 rounded-t-xl"
            style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})` }}
          />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2" style={{ color: colors.primary }}>
                  <Phone className="h-5 w-5" />
                  Phone Number Billing Records
                </CardTitle>
                <CardDescription>
                  {isAdmin 
                    ? 'Manage and process phone number billing charges via Sippy accountDebit API'
                    : 'View your phone number billing history and charges'
                  }
                </CardDescription>
              </div>
              <Button
                onClick={fetchBillings}
                disabled={isLoading}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Type</Label>
                <Select value={filters.transactionType} onValueChange={(value) => setFilters(prev => ({ ...prev, transactionType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="monthly_fee">Monthly Fee</SelectItem>
                    <SelectItem value="setup_fee">Setup Fee</SelectItem>
                    <SelectItem value="prorated_fee">Prorated Fee</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => setFilters({
                    status: 'all',
                    transactionType: 'all',
                    userId: 'all',
                    startDate: '',
                    endDate: '',
                  })}
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Billing Table */}
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: colors.primary }} />
                <p className="text-muted-foreground">Loading billing records...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchBillings} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : !billingsData?.billings?.length ? (
              <div className="text-center py-8">
                <Phone className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No billing records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          Operation Date
                          <ArrowDown className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Billing Date</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingsData.billings.map((billing) => (
                      <TableRow key={billing._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatDate(billing.createdAt)}</div>
                            <div className="text-sm text-muted-foreground">
                              {billing.transactionType.replace('_', ' ')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{billing.phoneNumber.number}</div>
                            <div className="text-sm text-muted-foreground">
                              {billing.phoneNumber.numberType}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{billing.phoneNumber.country}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{billing.user.name || billing.user.email}</div>
                            {(billing.user.onboarding?.companyName || billing.user.company) && (
                              <div className="text-sm text-muted-foreground">
                                {billing.user.onboarding?.companyName || billing.user.company}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(billing.amount, billing.currency)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTransactionTypeBadge(billing.transactionType)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(billing.status)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatDate(billing.billingDate)}</div>
                            {billing.paidDate && (
                              <div className="text-sm text-muted-foreground">
                                Paid: {formatDate(billing.paidDate)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setSelectedBilling(billing);
                                  setShowDetailsModal(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                              >
                                <Eye className="h-3 w-3" />
                                View details
                              </Button>
                              
                              {billing.status === 'pending' && (
                                <Button
                                  onClick={() => {
                                    setSelectedBilling(billing);
                                    setShowProcessDialog(true);
                                  }}
                                  size="sm"
                                  className="gap-2"
                                  style={{ backgroundColor: colors.primary }}
                                >
                                  <Zap className="h-3 w-3" />
                                  Process
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {billingsData && billingsData.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {billingsData.page} of {billingsData.totalPages} 
                  ({billingsData.total} total records)
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(billingsData.totalPages, prev + 1))}
                    disabled={currentPage === billingsData.totalPages}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Process Billing Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" style={{ color: colors.primary }} />
              Process Billing Charge
            </DialogTitle>
            <DialogDescription>
              This will charge the customer's Sippy account using the accountDebit API.
              Based on billing policy: full monthly rate, no proration, negative balance handling.
            </DialogDescription>
          </DialogHeader>

          {selectedBilling && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <strong>Phone Number:</strong> {selectedBilling.phoneNumber.number}
                  </div>
                  <div>
                    <strong>Country:</strong> {selectedBilling.phoneNumber.country}
                  </div>
                  <div>
                    <strong>User:</strong> {selectedBilling.user.name || selectedBilling.user.email}
                    {(selectedBilling.user.onboarding?.companyName || selectedBilling.user.company) && 
                      ` (${selectedBilling.user.onboarding?.companyName || selectedBilling.user.company})`}
                  </div>
                  <div>
                    <strong>Amount:</strong> {formatCurrency(selectedBilling.amount, selectedBilling.currency)}
                  </div>
                  <div>
                    <strong>Type:</strong> {selectedBilling.transactionType}
                  </div>
                </div>
                {selectedBilling.notes && (
                  <div className="mt-3 text-sm">
                    <strong>Notes:</strong> {selectedBilling.notes}
                  </div>
                )}
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Billing Policy:</strong> This charge follows the no-proration policy. 
                    If the account has insufficient funds, the number will be suspended and the 
                    charge will be marked as failed.
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => processBilling(selectedBilling._id)}
                  disabled={isProcessing}
                  className="flex-1 gap-2"
                  style={{ backgroundColor: colors.primary }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Process Charge
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowProcessDialog(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Billing Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" style={{ color: colors.primary }} />
              Billing Transaction Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this billing transaction
            </DialogDescription>
          </DialogHeader>

          {selectedBilling && (
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {/* Transaction Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Transaction ID</Label>
                  <p className="font-mono text-sm">{selectedBilling._id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedBilling.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(selectedBilling.amount, selectedBilling.currency)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="mt-1">
                    {getTransactionTypeBadge(selectedBilling.transactionType)}
                  </div>
                </div>
              </div>

              {/* Phone Number Information */}
              <div>
                <Label className="text-sm font-medium">Phone Number Details</Label>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <strong>Number:</strong> {selectedBilling.phoneNumber.number}
                    </div>
                    <div>
                      <strong>Country:</strong> {selectedBilling.phoneNumber.country}
                    </div>
                    <div>
                      <strong>Type:</strong> {selectedBilling.phoneNumber.numberType}
                    </div>
                    <div>
                      <strong>Monthly Rate:</strong> {formatCurrency(selectedBilling.phoneNumber.monthlyRate, selectedBilling.phoneNumber.currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* User Information */}
              <div>
                <Label className="text-sm font-medium">User Details</Label>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <strong>Name:</strong> {selectedBilling.user.name || selectedBilling.user.email}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedBilling.user.email}
                    </div>
                    {(selectedBilling.user.onboarding?.companyName || selectedBilling.user.company) && (
                      <div className="col-span-2">
                        <strong>Company:</strong> {selectedBilling.user.onboarding?.companyName || selectedBilling.user.company}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Billing Period */}
              <div>
                <Label className="text-sm font-medium">Billing Period</Label>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <strong>Period Start:</strong> {formatDate(selectedBilling.billingPeriodStart)}
                    </div>
                    <div>
                      <strong>Period End:</strong> {formatDate(selectedBilling.billingPeriodEnd)}
                    </div>
                    <div>
                      <strong>Billing Date:</strong> {formatDate(selectedBilling.billingDate)}
                    </div>
                    {selectedBilling.paidDate && (
                      <div>
                        <strong>Paid Date:</strong> {formatDate(selectedBilling.paidDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              {(selectedBilling.sippyTransactionId || selectedBilling.failureReason) && (
                <div>
                  <Label className="text-sm font-medium">Payment Information</Label>
                  <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-2 text-sm">
                      {selectedBilling.sippyTransactionId && (
                        <div>
                          <strong>Sippy Transaction ID:</strong>
                          <p className="font-mono text-xs mt-1">{selectedBilling.sippyTransactionId}</p>
                        </div>
                      )}
                      {selectedBilling.failureReason && (
                        <div>
                          <strong>Failure Reason:</strong>
                          <p className="text-red-600 mt-1">{selectedBilling.failureReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Assignment Information */}
              <div>
                <Label className="text-sm font-medium">Assignment Details</Label>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <strong>Assigned:</strong> {formatDate(selectedBilling.assignment.assignedAt)}
                    </div>
                    {selectedBilling.assignment.unassignedAt && (
                      <div>
                        <strong>Unassigned:</strong> {formatDate(selectedBilling.assignment.unassignedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Administrative Information */}
              <div>
                <Label className="text-sm font-medium">Administrative Details</Label>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <strong>Created:</strong> {formatDate(selectedBilling.createdAt)}
                    </div>
                    <div>
                      <strong>Updated:</strong> {formatDate(selectedBilling.updatedAt)}
                    </div>
                    {selectedBilling.processedBy && (
                      <div className="col-span-2">
                        <strong>Processed By:</strong> {selectedBilling.processedBy}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedBilling.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm">{selectedBilling.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDetailsModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 