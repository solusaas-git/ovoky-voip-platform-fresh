'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Hash,
  Calendar,
  Search,
  X,
  ChevronDown,
  Package,
  DollarSign,
  MapPin,
  Phone,
  PhoneCall,
  MessageSquare,
  FileText,
  Terminal,
  BookOpen,
  HelpCircle,
  AlertTriangle,
  Globe,
  Key,
  Eye,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  ExternalLink,
  RefreshCw,
  BarChart3,
  Info,
  Tag,
  MessageCircle,
  ShoppingCart,
  Loader2,
  UserX,
  Check,
  Copy,
  Grid3X3,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';
import { 
  PhoneNumber, 
  PhoneNumberRequest, 
  CreatePhoneNumberRequestForm, 
  RequestPriority 
} from '@/types/phoneNumber';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';

// Interface for backorder requests
interface BackorderRequest {
  _id: string;
  requestNumber: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  phoneNumberId: string; // Just the ID
  phoneNumber?: { // The populated phone number data
    _id: string;
    number: string;
    country: string;
    countryCode: string;
    numberType: string;
    provider: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  reason: string;
  businessJustification: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  processingNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Combined interface for displaying both types of requests
interface CombinedRequest {
  _id: string;
  requestNumber: string;
  requestType: 'cancel' | 'modify' | 'backorder';
  phoneNumber?: {
    _id: string;
    number: string;
    country: string;
    countryCode: string;
    numberType: string;
    provider: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  reason?: string;
  description?: string;
  businessJustification?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  reviewNotes?: string;
  processingNotes?: string;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Reputation data interface
interface ReputationData {
  dangerLevel: number;
  status: 'safe' | 'neutral' | 'annoying' | 'dangerous' | 'unknown';
  commentCount: number;
  visitCount: number;
  lastComment?: string;
  lastCommentDate?: string;
  lastVisitDate?: string;
  allComments?: Array<{
    text: string;
    date?: string;
    category?: string;
  }>;
  categories?: string[];
  description?: string;
  sourceUrl: string;
}

// Reputation badge interface
interface ReputationBadge {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  text: string;
  color: string;
}

export default function PhoneNumbersPage() {
  const { t } = useTranslations();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [requests, setRequests] = useState<CombinedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('numbers');
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false);
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CombinedRequest | null>(null);
  
  // Selection states for bulk operations
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [isBulkCancelling, setIsBulkCancelling] = useState(false);
  
  // Copy button states
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  // Reputation state
  const [showReputationModal, setShowReputationModal] = useState(false);
  const [reputationData, setReputationData] = useState<ReputationData | null>(null);
  const [reputationBadge, setReputationBadge] = useState<ReputationBadge | null>(null);
  const [isCheckingReputation, setIsCheckingReputation] = useState(false);
  const [reputationHasData, setReputationHasData] = useState(false);
  const [selectedNumberForReputation, setSelectedNumberForReputation] = useState<PhoneNumber | null>(null);
  
  // Track reputation data for all phone numbers
  const [phoneNumberReputations, setPhoneNumberReputations] = useState<Record<string, {
    status: ReputationData['status'];
    dangerLevel: number;
    hasData: boolean;
    isLoading: boolean;
  }>>({});
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelForm, setCancelForm] = useState<CreatePhoneNumberRequestForm>({
    phoneNumberId: '',
    requestType: 'cancel',
    reason: '',
    description: '',
    priority: 'medium' as RequestPriority,
    scheduledDate: undefined
  });

  // Bulk cancel form state
  const [bulkCancelForm, setBulkCancelForm] = useState({
    reason: '',
    description: '',
    priority: 'medium' as RequestPriority,
    scheduledDate: undefined as string | undefined
  });

  const router = useRouter();

  useEffect(() => {
    fetchPhoneNumbers();
    fetchRequests();
  }, [activeTab]);

  // Check reputation data for all phone numbers when they're loaded
  useEffect(() => {
    if (phoneNumbers.length > 0) {
      phoneNumbers.forEach(number => {
        if (!phoneNumberReputations[number.number]) {
          checkPhoneNumberReputation(number);
        }
      });
    }
  }, [phoneNumbers]);

  const fetchPhoneNumbers = async () => {
    try {
      setIsLoading(true);
      // Request all phone numbers by setting a high limit
      const response = await fetch('/api/phone-numbers?limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers');
      }
      const data = await response.json();
      setPhoneNumbers(data.phoneNumbers || []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      setPhoneNumbers([]);
      toast.error(t('phoneNumbers.messages.error.loadNumbers'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      // Fetch both regular requests and backorder requests in parallel
      const [regularRequestsResponse, backorderRequestsResponse] = await Promise.all([
        fetch('/api/phone-numbers/requests'),
        fetch('/api/backorder-requests')
      ]);

      const combinedRequests: CombinedRequest[] = [];

      // Process regular phone number requests
      if (regularRequestsResponse.ok) {
        const regularData = await regularRequestsResponse.json();
        const regularRequests = (regularData.requests || []).map((req: PhoneNumberRequest) => ({
          _id: req._id,
          requestNumber: req.requestNumber,
          requestType: req.requestType,
          phoneNumber: req.phoneNumber,
          reason: req.reason,
          description: req.description,
          priority: req.priority,
          status: req.status,
          reviewNotes: req.reviewNotes,
          scheduledDate: req.scheduledDate,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt
        }));
        combinedRequests.push(...regularRequests);
      }

      // Process backorder requests
      if (backorderRequestsResponse.ok) {
        const backorderData = await backorderRequestsResponse.json();
        const backorderRequests = (backorderData.requests || []).map((req: BackorderRequest) => {
          return {
            _id: req._id,
            requestNumber: req.requestNumber,
            requestType: 'backorder' as const,
            phoneNumber: req.phoneNumber ? {
              _id: req.phoneNumber._id,
              number: req.phoneNumber.number,
              country: req.phoneNumber.country,
              countryCode: req.phoneNumber.countryCode,
              numberType: req.phoneNumber.numberType,
              provider: req.phoneNumber.provider,
              monthlyRate: req.phoneNumber.monthlyRate,
              setupFee: req.phoneNumber.setupFee,
              currency: req.phoneNumber.currency,
              capabilities: req.phoneNumber.capabilities
            } : undefined,
            reason: req.reason,
            businessJustification: req.businessJustification,
            priority: req.priority,
            status: req.status,
            reviewNotes: req.reviewNotes,
            processingNotes: req.processingNotes,
            createdAt: req.createdAt,
            updatedAt: req.updatedAt
          };
        });
        combinedRequests.push(...backorderRequests);
      }

      // Sort combined requests by creation date (newest first)
      combinedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setRequests(combinedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedNumber) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/phone-numbers/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cancelForm,
          phoneNumberId: selectedNumber._id,
          requestType: 'cancel'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit cancel request');
      }

      const data = await response.json();
      toast.success(t('phoneNumbers.messages.success.requestSubmitted'));
      setShowCancelModal(false);
      setCancelForm({
        phoneNumberId: '',
        requestType: 'cancel',
        reason: '',
        description: '',
        priority: 'medium' as RequestPriority,
        scheduledDate: undefined
      });
      setSelectedNumber(null);
      fetchRequests();
    } catch (error) {
      console.error('Error submitting cancel request:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.messages.error.submitRequest'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawRequest = async (requestId: string, requestNumber: string) => {
    try {
      const response = await fetch(`/api/phone-numbers/requests?requestId=${requestId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to withdraw request');
      }

      toast.success(t('phoneNumbers.messages.success.requestWithdrawn'));
      fetchRequests(); // Refresh requests list
    } catch (error) {
      console.error('Error withdrawing request:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.messages.error.withdrawRequest'));
    }
  };

  // Selection functions for bulk operations
  const handleSelectNumber = (numberId: string, checked: boolean) => {
    // Find the number to check if it can be cancelled
    const number = phoneNumbers.find(n => n._id === numberId);
    if (!number) return;

    // Check if number can be cancelled (assigned status and no pending requests)
    const canCancel = getPhoneNumberDisplayStatus(number) === 'assigned' && 
      !requests.some(req => 
        req.phoneNumber?.number === number.number && 
        (req.status === 'pending' || req.status === 'approved')
      );

    if (!canCancel) {
      toast.warning('This number cannot be selected for cancellation (already has pending request or not assigned).');
      return;
    }
    
    const newSelected = new Set(selectedNumbers);
    if (checked) {
      if (newSelected.size >= 20) {
        toast.warning('You can only select up to 20 numbers for bulk cancellation.');
        return;
      }
      newSelected.add(numberId);
    } else {
      newSelected.delete(numberId);
    }
    setSelectedNumbers(newSelected);
    
    // Update select all state
    const availableForCancel = getAvailableForCancellation();
    setIsSelectAll(newSelected.size === availableForCancel.length && availableForCancel.length > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select numbers that can be cancelled
      const availableForCancel = getAvailableForCancellation();
      const limitedSelection = availableForCancel.slice(0, 20);
      const allIds = new Set(limitedSelection.map(number => number._id));
      setSelectedNumbers(allIds);
      setIsSelectAll(limitedSelection.length === availableForCancel.length);
      
      if (availableForCancel.length > 20) {
        toast.info(`Selected first 20 of ${availableForCancel.length} available numbers.`);
      }
    } else {
      setSelectedNumbers(new Set());
      setIsSelectAll(false);
    }
  };

  const getAvailableForCancellation = () => {
    return filteredNumbers.filter(number => {
      const status = getPhoneNumberDisplayStatus(number);
      return status === 'assigned' && !requests.some(req => 
        req.phoneNumber?.number === number.number && 
        (req.status === 'pending' || req.status === 'approved')
      );
    });
  };

  const getSelectedNumbers = () => {
    return phoneNumbers.filter(n => selectedNumbers.has(n._id));
  };

  const handleBulkCancel = async () => {
    if (selectedNumbers.size === 0) return;

    try {
      setIsBulkCancelling(true);
      const selectedPhoneNumbers = getSelectedNumbers();
      
      // Submit cancel requests for each selected number
      const cancelPromises = selectedPhoneNumbers.map(async (number) => {
        const response = await fetch('/api/phone-numbers/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumberId: number._id,
            requestType: 'cancel',
            reason: bulkCancelForm.reason,
            description: bulkCancelForm.description,
            priority: bulkCancelForm.priority,
            scheduledDate: bulkCancelForm.scheduledDate
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to cancel ${number.number}: ${error.error || 'Unknown error'}`);
        }

        return response.json();
      });

      await Promise.all(cancelPromises);
      
      toast.success(`Successfully submitted ${selectedNumbers.size} cancellation requests`);
      setShowBulkCancelModal(false);
      setBulkCancelForm({
        reason: '',
        description: '',
        priority: 'medium' as RequestPriority,
        scheduledDate: undefined
      });
      
      // Clear selections
      setSelectedNumbers(new Set());
      setIsSelectAll(false);
      
      // Refresh data
      fetchRequests();
      
    } catch (error) {
      console.error('Error bulk cancelling numbers:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit bulk cancellation requests');
    } finally {
      setIsBulkCancelling(false);
    }
  };

  // Reset selections when phone numbers change
  useEffect(() => {
    setSelectedNumbers(new Set());
    setIsSelectAll(false);
  }, [phoneNumbers]);

  const filteredNumbers = phoneNumbers.filter(number => {
    const matchesSearch = !searchTerm || 
      number.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      number.country.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || getPhoneNumberDisplayStatus(number) === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredNumbers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNumbers = filteredNumbers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'assigned': return 'default';
      case 'suspended': return 'destructive';
      case 'pending_cancellation': return 'secondary';
      default: return 'outline';
    }
  };

  const getPhoneNumberDisplayStatus = (number: PhoneNumber) => {
    // Check if there's a pending or approved cancellation request
    const hasPendingCancellation = requests.some(req => 
      req.phoneNumber?.number === number.number && 
      req.requestType === 'cancel' &&
      (req.status === 'pending' || req.status === 'approved')
    );
    
    if (hasPendingCancellation) {
      return 'pending_cancellation';
    }
    
    return number.status;
  };

  const getDisplayStatusText = (status: string) => {
    switch (status) {
      case 'pending_cancellation': return t('phoneNumbers.numbers.statuses.pendingCancellation');
      case 'assigned': return t('phoneNumbers.numbers.statuses.assigned');
      case 'suspended': return t('phoneNumbers.numbers.statuses.suspended');
      case 'available': return t('phoneNumbers.numbers.statuses.available');
      case 'reserved': return t('phoneNumbers.numbers.statuses.reserved');
      case 'cancelled': return t('phoneNumbers.numbers.statuses.cancelled');
      default: return status.replace('_', ' ');
    }
  };

  const getReasonDisplayText = (reason: string) => {
    switch (reason) {
      case 'no_longer_needed': return t('phoneNumbers.reasons.noLongerNeeded');
      case 'cost_reduction': return t('phoneNumbers.reasons.costReduction');
      case 'service_issues': return t('phoneNumbers.reasons.serviceIssues');
      case 'business_closure': return t('phoneNumbers.reasons.businessClosure');
      case 'other': return t('phoneNumbers.reasons.other');
      default: return reason;
    }
  };

  const getRequestBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'completed': return 'secondary';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'low': return 'outline';
      case 'medium': return 'default';
      case 'high': return 'destructive';
      case 'urgent': return 'destructive';
      default: return 'outline';
    }
  };

  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const handleCopyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      toast.success(t('phoneNumbers.messages.success.copiedToClipboard'));
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const normalizeReputationStatus = (status: ReputationData['status']) => {
    return status === 'unknown' ? 'safe' : status;
  };

  // Reputation functions
  const handleCheckReputation = async (number: PhoneNumber, forceRefresh: boolean = false) => {
    setSelectedNumberForReputation(number);
    setIsCheckingReputation(true);
    setReputationData(null);
    setReputationBadge(null);
    setReputationHasData(false);

    try {
      // First, check if we have stored data
      if (!forceRefresh) {
        const storedResponse = await fetch(`/api/phone-numbers/${encodeURIComponent(number.number)}/reputation`);
        if (storedResponse.ok) {
          const storedData = await storedResponse.json();
          if (storedData.hasData && storedData.reputation) {
            setReputationData(storedData.reputation);
            setReputationBadge(storedData.badge);
            setReputationHasData(storedData.hasData);
            setShowReputationModal(true);
            return;
          }
        }
      }

      // If no stored data or force refresh, fetch new data
      const response = await fetch(`/api/phone-numbers/${encodeURIComponent(number.number)}/reputation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh })
      });

      const data = await response.json();

      if (data.success && data.reputation) {
        setReputationData(data.reputation);
        setReputationBadge(data.badge);
        setReputationHasData(true);
        setShowReputationModal(true);
        toast.success(data.message || 'Reputation data retrieved successfully');
      } else {
        toast.error(data.error || t('phoneNumbers.messages.error.analyzeReputation'));
        if (data.details) {
          console.warn('Reputation check details:', data.details);
        }
      }
    } catch (error) {
      console.error('Error checking reputation:', error);
      toast.error(t('phoneNumbers.messages.error.analyzeReputation'));
    } finally {
      setIsCheckingReputation(false);
    }
  };

  // Check reputation for phone number card (without opening modal)
  const checkPhoneNumberReputation = async (number: PhoneNumber) => {
    const phoneNumber = number.number;
    
    // Set loading state
    setPhoneNumberReputations(prev => ({
      ...prev,
      [phoneNumber]: { 
        ...prev[phoneNumber],
        isLoading: true 
      }
    }));

    try {
      // First, check if we have stored data
      const storedResponse = await fetch(`/api/phone-numbers/${encodeURIComponent(phoneNumber)}/reputation`);
      if (storedResponse.ok) {
        const storedData = await storedResponse.json();
        if (storedData.hasData && storedData.reputation) {
          setPhoneNumberReputations(prev => ({
            ...prev,
            [phoneNumber]: {
              status: normalizeReputationStatus(storedData.reputation.status),
              dangerLevel: storedData.reputation.dangerLevel,
              hasData: true,
              isLoading: false
            }
          }));
          return;
        }
      }

      // No stored data, mark as no data available
      setPhoneNumberReputations(prev => ({
        ...prev,
        [phoneNumber]: {
          status: 'safe',
          dangerLevel: 0,
          hasData: false,
          isLoading: false
        }
      }));
    } catch (error) {
      console.error('Error checking reputation for', phoneNumber, ':', error);
      setPhoneNumberReputations(prev => ({
        ...prev,
        [phoneNumber]: {
          status: 'safe',
          dangerLevel: 0,
          hasData: false,
          isLoading: false
        }
      }));
    }
  };

  // Perform reputation analysis for a phone number
  const performReputationAnalysis = async (number: PhoneNumber) => {
    const phoneNumber = number.number;
    
    // Set loading state
    setPhoneNumberReputations(prev => ({
      ...prev,
      [phoneNumber]: { 
        ...prev[phoneNumber],
        isLoading: true 
      }
    }));

    try {
      const response = await fetch(`/api/phone-numbers/${encodeURIComponent(phoneNumber)}/reputation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: true })
      });

      const data = await response.json();

      if (data.success && data.reputation) {
        setPhoneNumberReputations(prev => ({
          ...prev,
          [phoneNumber]: {
            status: normalizeReputationStatus(data.reputation.status),
            dangerLevel: data.reputation.dangerLevel,
            hasData: true,
            isLoading: false
          }
        }));
        toast.success(`Reputation analysis completed for ${phoneNumber}`);
      } else {
        setPhoneNumberReputations(prev => ({
          ...prev,
          [phoneNumber]: {
            status: 'safe',
            dangerLevel: 0,
            hasData: false,
            isLoading: false
          }
        }));
        toast.error(t('phoneNumbers.messages.error.analyzeReputation'));
      }
    } catch (error) {
      console.error('Error performing reputation analysis:', error);
      setPhoneNumberReputations(prev => ({
        ...prev,
        [phoneNumber]: {
          status: 'safe',
          dangerLevel: 0,
          hasData: false,
          isLoading: false
        }
      }));
      toast.error(t('phoneNumbers.messages.error.analyzeReputation'));
    } finally {
      setIsCheckingReputation(false);
    }
  };

  const getReputationIcon = (status: ReputationData['status']) => {
    const normalizedStatus = normalizeReputationStatus(status);
    switch (normalizedStatus) {
      case 'safe':
        return <ShieldCheck className="h-4 w-4 text-green-600" />;
      case 'neutral':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'annoying':
        return <ShieldAlert className="h-4 w-4 text-yellow-600" />;
      case 'dangerous':
        return <ShieldX className="h-4 w-4 text-red-600" />;
      default:
        return <ShieldCheck className="h-4 w-4 text-green-600" />;
    }
  };

  const getReputationBadgeVariant = (status: ReputationData['status']) => {
    const normalizedStatus = normalizeReputationStatus(status);
    switch (normalizedStatus) {
      case 'safe':
        return 'default';
      case 'neutral':
        return 'secondary';
      case 'annoying':
        return 'destructive';
      case 'dangerous':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getReputationBadgeClasses = (status: ReputationData['status']) => {
    const normalizedStatus = normalizeReputationStatus(status);
    switch (normalizedStatus) {
      case 'safe':
        return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-900/50';
      case 'neutral':
        return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-900/50';
      case 'annoying':
        return 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-600 dark:hover:bg-orange-900/50';
      case 'dangerous':
        return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/50';
      default:
        return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-900/50';
    }
  };

  const getReputationDisplayText = (status: ReputationData['status'], dangerLevel: number) => {
    const normalizedStatus = normalizeReputationStatus(status);
    const translationKey = `phoneNumbers.reputation.displayText.${normalizedStatus}`;
    return t(translationKey, { dangerLevel: dangerLevel.toString() });
  };

  const formatDate = (date: string | Date) => {
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    } else if (date instanceof Date) {
      return date.toLocaleDateString();
    } else {
      throw new Error('Invalid date format');
    }
  };

  return (
    <MainLayout>
      <PageLayout
        title={t('phoneNumbers.page.title')}
        description={t('phoneNumbers.page.description')}
        breadcrumbs={[
          { label: t('phoneNumbers.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('phoneNumbers.page.breadcrumbs.services'), href: '/services' },
          { label: t('phoneNumbers.page.breadcrumbs.numbers') }
        ]}
        headerActions={
          <Button 
            onClick={() => router.push('/services/numbers/buy')}
            className="bg-green-600 hover:bg-green-700"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {t('phoneNumbers.header.buttons.buyNumbers')}
          </Button>
        }
      >
        {/* Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="numbers">{t('phoneNumbers.tabs.myNumbers')} ({phoneNumbers.length})</TabsTrigger>
            <TabsTrigger value="requests">{t('phoneNumbers.tabs.requests')} ({requests.length})</TabsTrigger>
          </TabsList>

          {/* Phone Numbers Tab */}
          <TabsContent value="numbers" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t('phoneNumbers.filters.title')}</CardTitle>
                  {filteredNumbers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={isSelectAll}
                        onCheckedChange={handleSelectAll}
                        className="mr-2"
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium">
                        Select all cancellable ({Math.min(getAvailableForCancellation().length, 20)})
                        {getAvailableForCancellation().length > 20 && (
                          <span className="text-muted-foreground"> (max 20)</span>
                        )}
                      </Label>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder={t('phoneNumbers.filters.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('phoneNumbers.filters.statusFilter.allStatuses')}</SelectItem>
                      <SelectItem value="assigned">{t('phoneNumbers.filters.statusFilter.active')}</SelectItem>
                      <SelectItem value="pending_cancellation">{t('phoneNumbers.filters.statusFilter.pendingCancellation')}</SelectItem>
                      <SelectItem value="suspended">{t('phoneNumbers.filters.statusFilter.suspended')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Items per page selector */}
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 per page</SelectItem>
                      <SelectItem value="12">12 per page</SelectItem>
                      <SelectItem value="24">24 per page</SelectItem>
                      <SelectItem value="48">48 per page</SelectItem>
                      <SelectItem value="96">96 per page</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Toggle */}
                  <div className="flex border rounded-lg p-1 bg-muted/50">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="px-3"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="px-3"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {(searchTerm || statusFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      className="px-3"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Phone Numbers Display */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredNumbers.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('phoneNumbers.numbers.empty.title')}</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' 
                        ? t('phoneNumbers.numbers.empty.descriptionFiltered')
                        : t('phoneNumbers.numbers.empty.descriptionEmpty')
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedNumbers.map((number) => {
                  const canCancel = getPhoneNumberDisplayStatus(number) === 'assigned' && 
                    !requests.some(req => 
                      req.phoneNumber?.number === number.number && 
                      (req.status === 'pending' || req.status === 'approved')
                    );
                  
                  return (
                    <Card key={number._id} className={`hover:shadow-lg transition-shadow ${selectedNumbers.has(number._id) ? 'ring-2 ring-red-500 bg-red-50/50 dark:bg-red-950/30 dark:ring-red-400' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            checked={selectedNumbers.has(number._id)}
                            onCheckedChange={(checked) => handleSelectNumber(number._id, !!checked)}
                            className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                            disabled={!canCancel}
                          />
                          <CardTitle className="text-lg font-mono flex-1">{number.number}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge variant={getBadgeVariant(getPhoneNumberDisplayStatus(number))}>
                              {getDisplayStatusText(getPhoneNumberDisplayStatus(number))}
                            </Badge>
                          </div>
                        </div>
                      <div className="flex items-center justify-between">
                        <CardDescription>
                          {number.country} • {number.numberType}
                        </CardDescription>
                        
                        {/* Reputation Tag */}
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const reputation = phoneNumberReputations[number.number];
                            
                            if (reputation?.isLoading) {
                              return (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md border dark:border-gray-700">
                                  <Loader2 className="h-3 w-3 animate-spin text-gray-600 dark:text-gray-400" />
                                  <span className="text-xs text-gray-600 dark:text-gray-400">{t('phoneNumbers.reputation.cards.checking')}</span>
                                </div>
                              );
                            }
                            
                            if (reputation?.hasData) {
                              return (
                                <Badge 
                                  variant="outline"
                                  className={`text-xs px-2 py-1 cursor-pointer transition-colors ${getReputationBadgeClasses(reputation.status)}`}
                                  onClick={() => handleCheckReputation(number)}
                                  title="Click to view detailed reputation report"
                                >
                                  <div className="flex items-center space-x-1">
                                    {getReputationIcon(reputation.status)}
                                    <span>{getReputationDisplayText(reputation.status, reputation.dangerLevel)}</span>
                                  </div>
                                </Badge>
                              );
                            }
                            
                            // No data available - show analyze button
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => performReputationAnalysis(number)}
                                className="text-xs px-2 py-1 h-auto bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-950/70 dark:border-blue-700 dark:text-blue-400"
                                title={t('phoneNumbers.reputation.tooltips.analyze')}
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                {t('phoneNumbers.reputation.modal.buttons.analyze')}
                              </Button>
                            );
                          })()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('phoneNumbers.numbers.fields.monthlyRate')}</Label>
                          <p className="font-medium">
                            {number.monthlyRate ? formatCurrency(number.monthlyRate, number.currency) : 'Free'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('phoneNumbers.numbers.fields.nextBilling')}</Label>
                          <p className="font-medium">
                            {number.nextBillingDate ? formatDate(number.nextBillingDate) : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {number.capabilities && number.capabilities.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('phoneNumbers.numbers.fields.capabilities')}</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {number.capabilities.map((capability) => (
                              <Badge key={capability} variant="outline" className="text-xs">
                                {capability}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedNumber(number);
                            setShowDetailsModal(true);
                          }}
                          className="flex-1"
                        >
                          {t('phoneNumbers.numbers.buttons.viewDetails')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckReputation(number)}
                          disabled={isCheckingReputation}
                          className="text-blue-600 hover:text-blue-700"
                          title={t('phoneNumbers.reputation.tooltips.analyze')}
                        >
                          {isCheckingReputation && selectedNumberForReputation?.number === number.number ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              <span className="text-xs">{t('phoneNumbers.reputation.actions.checking')}</span>
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-1" />
                              <span className="text-xs">{t('phoneNumbers.reputation.modal.buttons.analyze')}</span>
                            </>
                          )}
                        </Button>
                        {(getPhoneNumberDisplayStatus(number) === 'assigned') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedNumber(number);
                              setShowCancelModal(true);
                            }}
                            className="text-red-600 hover:text-red-700"
                            disabled={requests.some(req => 
                              req.phoneNumber?.number === number.number && 
                              (req.status === 'pending' || req.status === 'approved')
                            )}
                            title={requests.some(req => 
                              req.phoneNumber?.number === number.number && 
                              (req.status === 'pending' || req.status === 'approved')
                            ) ? t('phoneNumbers.numbers.tooltips.requestAlreadyPending') : t('phoneNumbers.numbers.tooltips.requestCancellation')}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Show pending request info */}
                      {(() => {
                        const pendingRequest = requests.find(req => 
                          req.phoneNumber?.number === number.number && 
                          req.requestType === 'cancel' &&
                          (req.status === 'pending' || req.status === 'approved')
                        );
                        
                        if (pendingRequest) {
                          return (
                            <div className="mt-3 p-2 bg-muted/50 rounded-lg border-l-2 border-orange-400">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                  <p className="text-xs text-muted-foreground">
                                    {t('phoneNumbers.numbers.pendingRequest.cancellationPending', { 
                                      requestNumber: pendingRequest.requestNumber, 
                                      status: pendingRequest.status 
                                    })}
                                  </p>
                                </div>
                                {pendingRequest.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleWithdrawRequest(pendingRequest._id, pendingRequest.requestNumber)}
                                    className="text-xs h-6 px-2 text-blue-600 hover:text-blue-700"
                                    title="Cancel the cancellation request and keep your number"
                                  >
                                    {t('phoneNumbers.numbers.buttons.keepNumber')}
                                  </Button>
                                )}
                              </div>
                              {pendingRequest.scheduledDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t('phoneNumbers.numbers.pendingRequest.scheduled', { 
                                    date: formatDate(pendingRequest.scheduledDate) 
                                  })}
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead className="w-[180px]">Phone Number</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reputation</TableHead>
                        <TableHead>Monthly Rate</TableHead>
                        <TableHead>Next Billing</TableHead>
                        <TableHead>Capabilities</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedNumbers.map((number) => {
                        const canCancel = getPhoneNumberDisplayStatus(number) === 'assigned' && 
                          !requests.some(req => 
                            req.phoneNumber?.number === number.number && 
                            (req.status === 'pending' || req.status === 'approved')
                          );
                        
                        return (
                          <TableRow key={number._id} className={`hover:bg-muted/50 ${selectedNumbers.has(number._id) ? 'bg-red-50/50 dark:bg-red-950/30' : ''}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedNumbers.has(number._id)}
                                onCheckedChange={(checked) => handleSelectNumber(number._id, !!checked)}
                                className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                disabled={!canCancel}
                              />
                            </TableCell>
                            <TableCell className="font-mono font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{number.number}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyToClipboard(number.number, `number-${number._id}`)}
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  {copiedStates[`number-${number._id}`] ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <span>{number.country}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {number.numberType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant(getPhoneNumberDisplayStatus(number))}>
                              {getDisplayStatusText(getPhoneNumberDisplayStatus(number))}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const reputation = phoneNumberReputations[number.number];
                              
                              if (reputation?.isLoading) {
                                return (
                                  <div className="flex items-center space-x-1">
                                    <Loader2 className="h-3 w-3 animate-spin text-gray-600 dark:text-gray-400" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Checking...</span>
                                  </div>
                                );
                              }
                              
                              if (reputation?.hasData) {
                                return (
                                  <Badge 
                                    variant="outline"
                                    className={`text-xs cursor-pointer transition-colors ${getReputationBadgeClasses(reputation.status)}`}
                                    onClick={() => handleCheckReputation(number)}
                                    title="Click to view detailed reputation report"
                                  >
                                    <div className="flex items-center space-x-1">
                                      {getReputationIcon(reputation.status)}
                                      <span>{getReputationDisplayText(reputation.status, reputation.dangerLevel)}</span>
                                    </div>
                                  </Badge>
                                );
                              }
                              
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => performReputationAnalysis(number)}
                                  className="text-xs px-2 py-1 h-auto bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-950/70 dark:border-blue-700 dark:text-blue-400"
                                >
                                  <Shield className="h-3 w-3 mr-1" />
                                  Analyze
                                </Button>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">
                                {number.monthlyRate ? `€${number.monthlyRate.toFixed(2)}` : 'Free'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {number.nextBillingDate ? formatDate(number.nextBillingDate) : 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {number.capabilities && number.capabilities.length > 0 ? (
                                number.capabilities.slice(0, 2).map((capability) => (
                                  <Badge key={capability} variant="outline" className="text-xs">
                                    {capability}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                              {number.capabilities && number.capabilities.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{number.capabilities.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedNumber(number);
                                  setShowDetailsModal(true);
                                }}
                                className="h-8 px-2"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCheckReputation(number)}
                                disabled={isCheckingReputation}
                                className="h-8 px-2 text-blue-600 hover:text-blue-700"
                                title="Check reputation"
                              >
                                {isCheckingReputation && selectedNumberForReputation?.number === number.number ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Shield className="h-3 w-3" />
                                )}
                              </Button>
                              {(getPhoneNumberDisplayStatus(number) === 'assigned') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedNumber(number);
                                    setShowCancelModal(true);
                                  }}
                                  className="h-8 px-2 text-red-600 hover:text-red-700"
                                  disabled={requests.some(req => 
                                    req.phoneNumber?.number === number.number && 
                                    (req.status === 'pending' || req.status === 'approved')
                                  )}
                                  title={requests.some(req => 
                                    req.phoneNumber?.number === number.number && 
                                    (req.status === 'pending' || req.status === 'approved')
                                  ) ? 'Request already pending' : 'Request cancellation'}
                                >
                                  <UserX className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            
                            {/* Show pending request info in list view */}
                            {(() => {
                              const pendingRequest = requests.find(req => 
                                req.phoneNumber?.number === number.number && 
                                req.requestType === 'cancel' &&
                                (req.status === 'pending' || req.status === 'approved')
                              );
                              
                              if (pendingRequest) {
                                return (
                                  <div className="mt-2 p-1 bg-orange-50 dark:bg-orange-950/20 rounded border-l-2 border-orange-400">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-1">
                                        <div className="w-1 h-1 bg-orange-400 rounded-full animate-pulse"></div>
                                        <p className="text-xs text-orange-700 dark:text-orange-400">
                                          Cancellation {pendingRequest.status}
                                        </p>
                                      </div>
                                      {pendingRequest.status === 'pending' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleWithdrawRequest(pendingRequest._id, pendingRequest.requestNumber)}
                                          className="text-xs h-5 px-1 text-blue-600 hover:text-blue-700"
                                        >
                                          Keep
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Bulk Actions Bar */}
            {selectedNumbers.size > 0 && (
              <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-700">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium text-red-700 dark:text-red-300">
                          {selectedNumbers.size} number{selectedNumbers.size > 1 ? 's' : ''} selected for cancellation
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedNumbers(new Set());
                          setIsSelectAll(false);
                        }}
                        className="text-xs"
                      >
                        Clear selection
                      </Button>
                    </div>
                    <Button
                      onClick={() => setShowBulkCancelModal(true)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={selectedNumbers.size === 0}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Cancel {selectedNumbers.size} Number{selectedNumbers.size > 1 ? 's' : ''}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {filteredNumbers.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredNumbers.length)} of {filteredNumbers.length} numbers
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* First page button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Previous page button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      // Adjust start page if we're near the end
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={currentPage === i ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(i)}
                            className="h-8 w-8 p-0"
                          >
                            {i}
                          </Button>
                        );
                      }
                      
                      return pages;
                    })()}
                  </div>
                  
                  {/* Next page button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  {/* Last page button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('phoneNumbers.requests.empty.title')}</h3>
                    <p className="text-muted-foreground">
                      {t('phoneNumbers.requests.empty.description')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t('phoneNumbers.requests.title')}</CardTitle>
                  <CardDescription>
                    {t('phoneNumbers.requests.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('phoneNumbers.requests.table.headers.requestId')}</TableHead>
                        <TableHead>{t('phoneNumbers.requests.table.headers.type')}</TableHead>
                        <TableHead>{t('phoneNumbers.requests.table.headers.phoneNumber')}</TableHead>
                        <TableHead>{t('phoneNumbers.requests.table.headers.status')}</TableHead>
                        <TableHead>{t('phoneNumbers.requests.table.headers.priority')}</TableHead>
                        <TableHead>{t('phoneNumbers.requests.table.headers.submitted')}</TableHead>
                        <TableHead className="text-right">{t('phoneNumbers.requests.table.headers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request._id}>
                          <TableCell className="font-mono text-sm">
                            {request.requestNumber}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={request.requestType === 'backorder' ? 'outline' : 'secondary'}
                              className={
                                request.requestType === 'backorder' 
                                  ? 'text-orange-600 border-orange-200' 
                                  : (request.requestType === 'cancel'
                                    ? 'text-red-600 border-red-200'
                                    : 'text-blue-600 border-blue-200')
                              }
                            >
                              {request.requestType === 'backorder' ? t('phoneNumbers.requests.types.purchase') : 
                               request.requestType === 'cancel' ? t('phoneNumbers.requests.types.cancel') : 
                               t('phoneNumbers.requests.types.modify')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {request.phoneNumber?.number || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRequestBadgeVariant(request.status)}>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityBadgeVariant(request.priority)}>
                              {request.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(request.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRequestDetailsModal(true);
                                }}
                              >
                                {t('phoneNumbers.requests.buttons.viewDetails')}
                              </Button>
                              {request.status === 'pending' && request.requestType === 'cancel' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleWithdrawRequest(request._id, request.requestNumber)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  {t('phoneNumbers.requests.buttons.keepNumber')}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Request Details Modal */}
        <Dialog open={showRequestDetailsModal} onOpenChange={setShowRequestDetailsModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {t('phoneNumbers.modals.requestDetails.title')}
                {selectedRequest && (
                  <Badge 
                    variant={selectedRequest.requestType === 'backorder' ? 'outline' : 'secondary'}
                    className={
                      selectedRequest.requestType === 'backorder' 
                        ? 'text-orange-600 border-orange-200' 
                        : (selectedRequest.requestType === 'cancel'
                          ? 'text-red-600 border-red-200'
                          : 'text-blue-600 border-blue-200')
                    }
                  >
                    {selectedRequest.requestType === 'backorder' ? t('phoneNumbers.requests.types.purchaseRequest') : 
                     selectedRequest.requestType === 'cancel' ? t('phoneNumbers.requests.types.cancellationRequest') : 
                     t('phoneNumbers.requests.types.modificationRequest')}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest?.requestType === 'backorder' 
                  ? t('phoneNumbers.modals.requestDetails.descriptions.backorder')
                  : selectedRequest?.requestType === 'cancel'
                  ? t('phoneNumbers.modals.requestDetails.descriptions.cancel')
                  : t('phoneNumbers.modals.requestDetails.descriptions.modify')
                }
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-6">
                {/* Request Overview */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.requestId')}</Label>
                    <p className="font-mono font-medium">{selectedRequest.requestNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.status')}</Label>
                    <Badge variant={getRequestBadgeVariant(selectedRequest.status)} className="mt-1">
                      {selectedRequest.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.priority')}</Label>
                    <Badge variant={getPriorityBadgeVariant(selectedRequest.priority)} className="mt-1">
                      {selectedRequest.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.submitted')}</Label>
                    <p className="text-sm">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.lastUpdated')}</Label>
                    <p className="text-sm">{formatDate(selectedRequest.updatedAt)}</p>
                  </div>
                  {selectedRequest.scheduledDate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.scheduledDate')}</Label>
                      <p className="text-sm">{formatDate(selectedRequest.scheduledDate)}</p>
                    </div>
                  )}
                </div>

                {/* Phone Number Details */}
                {selectedRequest.phoneNumber && (
                  <div>
                    <h4 className="font-semibold mb-3">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.title')}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.number')}</Label>
                        <p className="font-mono font-medium text-lg">{selectedRequest.phoneNumber.number}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.country')}</Label>
                        <p>{selectedRequest.phoneNumber.country} (+{selectedRequest.phoneNumber.countryCode})</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.type')}</Label>
                        <p>{selectedRequest.phoneNumber.numberType}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.provider')}</Label>
                        <p>{selectedRequest.phoneNumber.provider}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.monthlyRate')}</Label>
                        <p className="font-medium">
                          {formatCurrency(selectedRequest.phoneNumber.monthlyRate, selectedRequest.phoneNumber.currency)}
                        </p>
                      </div>
                      {selectedRequest.phoneNumber.setupFee && (
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.setupFee')}</Label>
                          <p className="font-medium">
                            {formatCurrency(selectedRequest.phoneNumber.setupFee, selectedRequest.phoneNumber.currency)}
                          </p>
                        </div>
                      )}
                      {selectedRequest.phoneNumber.capabilities && selectedRequest.phoneNumber.capabilities.length > 0 && (
                        <div className="col-span-full">
                          <Label className="text-xs text-muted-foreground">Capabilities</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedRequest.phoneNumber.capabilities.map((capability) => (
                              <Badge key={capability} variant="outline" className="text-xs">
                                {capability}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Request Details */}
                <div>
                  <h4 className="font-semibold mb-3">Request Information</h4>
                  <div className="space-y-4">
                    {selectedRequest.reason && (
                      <div>
                        <Label className="text-sm font-medium">Reason</Label>
                        <p className="text-sm mt-1 p-3 bg-muted/50 rounded">
                          {getReasonDisplayText(selectedRequest.reason)}
                        </p>
                      </div>
                    )}

                    {selectedRequest.requestType === 'backorder' && selectedRequest.businessJustification && (
                      <div>
                        <Label className="text-sm font-medium">Business Justification</Label>
                        <p className="text-sm mt-1 p-3 bg-muted/50 rounded whitespace-pre-wrap">
                          {selectedRequest.businessJustification}
                        </p>
                      </div>
                    )}

                    {selectedRequest.description && (
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <p className="text-sm mt-1 p-3 bg-muted/50 rounded whitespace-pre-wrap">
                          {selectedRequest.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin/Review Notes */}
                {(selectedRequest.reviewNotes || selectedRequest.processingNotes) && (
                  <div>
                    <h4 className="font-semibold mb-3">Admin Response</h4>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="whitespace-pre-wrap">
                        {selectedRequest.reviewNotes || selectedRequest.processingNotes}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Actions */}
                {selectedRequest.status === 'pending' && selectedRequest.requestType === 'cancel' && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleWithdrawRequest(selectedRequest._id, selectedRequest.requestNumber);
                        setShowRequestDetailsModal(false);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Keep My Number
                    </Button>
                  </div>
                )}

                {/* Status Timeline for Backorder Requests */}
                {selectedRequest.requestType === 'backorder' && (
                  <div>
                    <h4 className="font-semibold mb-3">What Happens Next?</h4>
                    <div className="space-y-3 text-sm">
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        selectedRequest.status === 'pending' ? 'bg-orange-50 border border-orange-200' : 'bg-muted/50'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          selectedRequest.status === 'pending' ? 'bg-orange-500 animate-pulse' : 'bg-muted-foreground'
                        }`}></div>
                        <div>
                          <p className="font-medium">Under Review</p>
                          <p className="text-muted-foreground">
                            Admin team is reviewing your backorder request and business justification
                          </p>
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        selectedRequest.status === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-muted/50'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          selectedRequest.status === 'approved' ? 'bg-green-500' : 'bg-muted-foreground'
                        }`}></div>
                        <div>
                          <p className="font-medium">Assignment & Billing</p>
                          <p className="text-muted-foreground">
                            Number will be assigned to your account and billing will begin
                          </p>
                        </div>
                      </div>

                      {selectedRequest.status === 'rejected' && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <div>
                            <p className="font-medium">Request Rejected</p>
                            <p className="text-muted-foreground">
                              See admin notes above for the reason and next steps
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Phone Number Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="sm:max-w-4xl max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader className="pb-4 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    {t('phoneNumbers.modals.numberDetails.title')}
                  </DialogTitle>
                  <DialogDescription className="text-base mt-2">
                    {t('phoneNumbers.modals.numberDetails.description', { number: selectedNumber?.number || '' })}
                  </DialogDescription>
                </div>
                {selectedNumber && (
                  <div className="flex items-center space-x-3">
                    <Badge variant={getBadgeVariant(getPhoneNumberDisplayStatus(selectedNumber))} className="px-3 py-1.5 text-sm font-medium">
                      {getDisplayStatusText(getPhoneNumberDisplayStatus(selectedNumber))}
                    </Badge>
                    {selectedNumber.backorderOnly && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200 px-3 py-1.5">
                        {t('phoneNumbers.modals.numberDetails.badges.backorderOnly')}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>
            
            {selectedNumber && (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 py-2">
                {/* Scroll indicator */}
                <div className="text-center text-xs text-muted-foreground mb-2">
                  {t('phoneNumbers.modals.numberDetails.scrollIndicator')}
                </div>

                {/* Header Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl p-6 border border-blue-200/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">{t('phoneNumbers.modals.numberDetails.sections.numberInfo.title')}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(selectedNumber.number, 'number')}
                      className="text-xs"
                    >
                      {copiedStates.number ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-green-600" />
                          {t('phoneNumbers.modals.numberDetails.buttons.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          {t('phoneNumbers.modals.numberDetails.buttons.copyNumber')}
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <Label className="text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wide">{t('phoneNumbers.modals.numberDetails.sections.numberInfo.fields.phoneNumber')}</Label>
                      <p className="font-mono text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">{selectedNumber.number}</p>
                    </div>
                    <div>
                      <Label className="text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wide">{t('phoneNumbers.modals.numberDetails.sections.numberInfo.fields.country')}</Label>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mt-1">
                        {selectedNumber.country} (+{selectedNumber.countryCode})
                      </p>
                    </div>
                    <div>
                      <Label className="text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wide">{t('phoneNumbers.modals.numberDetails.sections.numberInfo.fields.type')}</Label>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mt-1">{selectedNumber.numberType}</p>
                    </div>
                  </div>
                </div>

                {/* Billing Information */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-xl p-6 border border-green-200/50">
                  <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">{t('phoneNumbers.modals.numberDetails.sections.billing.title')}</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <Label className="text-green-700 dark:text-green-300 text-xs font-medium uppercase tracking-wide">Monthly Rate</Label>
                      <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-1">
                        {selectedNumber.monthlyRate ? formatCurrency(selectedNumber.monthlyRate, selectedNumber.currency) : 'Free'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-green-700 dark:text-green-300 text-xs font-medium uppercase tracking-wide">Setup Fee</Label>
                      <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-1">
                        {selectedNumber.setupFee ? formatCurrency(selectedNumber.setupFee, selectedNumber.currency) : 'Free'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-green-700 dark:text-green-300 text-xs font-medium uppercase tracking-wide">Billing Cycle</Label>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mt-1 capitalize">{selectedNumber.billingCycle}</p>
                    </div>
                    <div>
                      <Label className="text-green-700 dark:text-green-300 text-xs font-medium uppercase tracking-wide">Next Billing</Label>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mt-1">
                        {selectedNumber.nextBillingDate ? formatDate(selectedNumber.nextBillingDate) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assignment Information */}
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50 rounded-xl p-6 border border-purple-200/50">
                  <h3 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4">Assignment Details</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">Assigned Date</Label>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mt-1">
                        {selectedNumber.assignedAt ? formatDate(selectedNumber.assignedAt) : 'Not assigned'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">Billing Day</Label>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mt-1">
                        {selectedNumber.billingDayOfMonth ? `${selectedNumber.billingDayOfMonth}${getOrdinalSuffix(selectedNumber.billingDayOfMonth)} of month` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">Region</Label>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mt-1">
                        {selectedNumber.region || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  {selectedNumber.timeZone && (
                    <div className="mt-4">
                      <Label className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">Time Zone</Label>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mt-1">{selectedNumber.timeZone}</p>
                    </div>
                  )}
                </div>

                {/* Capabilities */}
                {selectedNumber.capabilities && selectedNumber.capabilities.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 rounded-xl p-6 border border-amber-200/50">
                    <h3 className="text-xl font-semibold text-amber-900 dark:text-amber-100 mb-4">Service Capabilities</h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedNumber.capabilities.map((capability) => (
                        <Badge 
                          key={capability} 
                          variant="secondary" 
                          className="px-4 py-2 text-sm font-medium bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-100"
                        >
                          <div className="flex items-center gap-2">
                            {capability === 'voice' && <Phone className="h-4 w-4" />}
                            {capability === 'sms' && <MessageSquare className="h-4 w-4" />}
                            {capability === 'fax' && <FileText className="h-4 w-4" />}
                            <span className="capitalize">{capability}</span>
                          </div>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Connection Parameters - Enhanced Section */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50 rounded-xl p-6 border-2 border-blue-300 border-dashed">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Terminal className="h-5 w-5" />
                      🔧 {t('phoneNumbers.modals.numberDetails.sections.technical.title')}
                    </h3>
                    {selectedNumber.connectionType && (
                      <Badge variant="outline" className="text-slate-700 border-slate-300 dark:text-slate-300">
                        {selectedNumber.connectionType === 'ip_routing' ? 'IP Routing' : 'Credential-Based'}
                      </Badge>
                    )}
                  </div>
                  
                  {selectedNumber.connectionType ? (
                    <div className="space-y-6">
                      {/* Connection Method Overview */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Connection Method</Label>
                          <div className="mt-2 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${selectedNumber.connectionType === 'ip_routing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                {selectedNumber.connectionType === 'ip_routing' ? <Globe className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {selectedNumber.connectionType === 'ip_routing' ? 'IP Address Routing' : 'Username/Password Authentication'}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                  {selectedNumber.connectionType === 'ip_routing' 
                                    ? 'Direct routing based on source IP address' 
                                    : 'Authentication using login credentials'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Configuration Status</Label>
                          <div className="mt-2 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-green-100 text-green-700">
                                <Check className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100">Configured</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ready for use</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Connection Details */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                          <Terminal className="h-4 w-4" />
                          Connection Parameters
                        </h4>
                        
                        {selectedNumber.connectionType === 'ip_routing' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedNumber.ipAddress && (
                              <div className="group">
                                <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">IP Address</Label>
                                <div className="mt-2 flex items-center gap-2">
                                  <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                    {selectedNumber.ipAddress}
                                  </code>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyToClipboard(selectedNumber.ipAddress!, 'ipAddress')}
                                    className="transition-all duration-200"
                                    title="Copy to clipboard"
                                  >
                                    {copiedStates.ipAddress ? (
                                      <Check className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {selectedNumber.port && (
                              <div className="group">
                                <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Port</Label>
                                <div className="mt-2 flex items-center gap-2">
                                  <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                    {selectedNumber.port}
                                  </code>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyToClipboard(selectedNumber.port!.toString(), 'port')}
                                    className="transition-all duration-200"
                                    title="Copy to clipboard"
                                  >
                                    {copiedStates.port ? (
                                      <Check className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {selectedNumber.connectionType === 'credentials' && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedNumber.login && (
                                <div className="group">
                                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Username</Label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                      {selectedNumber.login}
                                    </code>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCopyToClipboard(selectedNumber.login!, 'login')}
                                      className="transition-all duration-200"
                                      title="Copy to clipboard"
                                    >
                                      {copiedStates.login ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {selectedNumber.password && (
                                <div className="group">
                                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Password</Label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                      ••••••••
                                    </code>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCopyToClipboard(selectedNumber.password!, 'password')}
                                      className="transition-all duration-200"
                                      title="Copy password to clipboard"
                                    >
                                      {copiedStates.password ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedNumber.domain && (
                                <div className="group">
                                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Server/Domain</Label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                      {selectedNumber.domain}
                                    </code>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCopyToClipboard(selectedNumber.domain!, 'domain')}
                                      className="transition-all duration-200"
                                      title="Copy to clipboard"
                                    >
                                      {copiedStates.domain ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {selectedNumber.credentialsPort && (
                                <div className="group">
                                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Port</Label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                      {selectedNumber.credentialsPort}
                                    </code>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCopyToClipboard(selectedNumber.credentialsPort!.toString(), 'credentialsPort')}
                                      className="transition-all duration-200"
                                      title="Copy to clipboard"
                                    >
                                      {copiedStates.credentialsPort ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Quick Setup Guide */}
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-3">
                            <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">{t('phoneNumbers.modals.numberDetails.sections.setupInstructions.title')}</p>
                              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                {selectedNumber.connectionType === 'ip_routing' 
                                  ? t('phoneNumbers.modals.numberDetails.sections.setupInstructions.ipRouting', { 
                                      ipAddress: selectedNumber.ipAddress || '', 
                                      port: (selectedNumber.port || 5060).toString() 
                                    })
                                  : t('phoneNumbers.modals.numberDetails.sections.setupInstructions.credentials', { 
                                      login: selectedNumber.login || '', 
                                      domain: selectedNumber.domain || '', 
                                      port: (selectedNumber.credentialsPort || 5060).toString() 
                                    })
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Configuration Pending</h4>
                      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                        Technical connection parameters haven't been configured for this number yet. 
                        Contact our support team for setup assistance.
                      </p>
                      <Button variant="outline" className="gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Contact Support
                      </Button>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedNumber.description && (
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/50 dark:to-cyan-950/50 rounded-xl p-6 border border-teal-200/50">
                    <h3 className="text-xl font-semibold text-teal-900 dark:text-teal-100 mb-3">Description</h3>
                    <p className="text-teal-800 dark:text-teal-200 leading-relaxed">{selectedNumber.description}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="border-t pt-4 mt-6">
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="px-6">
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Phone Number Reputation Modal */}
        <Dialog open={showReputationModal} onOpenChange={setShowReputationModal}>
          <DialogContent className="sm:max-w-4xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="pb-4 flex-shrink-0">
              <DialogTitle className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-xl font-semibold">{t('phoneNumbers.reputation.modal.title')}</span>
                  <p className="text-sm text-muted-foreground font-normal">
                    {selectedNumberForReputation?.number}
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>

            {reputationData ? (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 py-2">
                {/* Scroll indicator */}
                <div className="text-center text-xs text-muted-foreground mb-2">
                  {t('phoneNumbers.reputation.modal.scrollIndicator')}
                </div>

                {/* Status Overview Card */}
                <div className={`p-6 rounded-xl border-2 shadow-lg ${
                  reputationData.status === 'safe' ? 'bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 border-green-300 dark:from-green-950/50 dark:via-green-900/50 dark:to-emerald-950/50 dark:border-green-600' :
                  reputationData.status === 'neutral' ? 'bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 border-blue-300 dark:from-blue-950/50 dark:via-blue-900/50 dark:to-indigo-950/50 dark:border-blue-600' :
                  reputationData.status === 'annoying' ? 'bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 border-orange-300 dark:from-orange-950/50 dark:via-orange-900/50 dark:to-yellow-950/50 dark:border-orange-600' :
                  reputationData.status === 'dangerous' ? 'bg-gradient-to-br from-red-50 via-red-100 to-rose-100 border-red-300 dark:from-red-950/50 dark:via-red-900/50 dark:to-rose-950/50 dark:border-red-600' :
                  'bg-gradient-to-br from-gray-50 via-gray-100 to-slate-100 border-gray-300 dark:from-gray-950/50 dark:via-gray-900/50 dark:to-slate-950/50 dark:border-gray-600'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl shadow-md ${
                        reputationData.status === 'safe' ? 'bg-green-200 dark:bg-green-800/50' :
                        reputationData.status === 'neutral' ? 'bg-blue-200 dark:bg-blue-800/50' :
                        reputationData.status === 'annoying' ? 'bg-orange-200 dark:bg-orange-800/50' :
                        reputationData.status === 'dangerous' ? 'bg-red-200 dark:bg-red-800/50' :
                        'bg-gray-200 dark:bg-gray-800/50'
                      }`}>
                        {getReputationIcon(reputationData.status)}
                      </div>
                      <div>
                        <h3 className={`text-2xl font-bold capitalize ${
                          reputationData.status === 'safe' ? 'text-green-800 dark:text-green-200' :
                          reputationData.status === 'neutral' ? 'text-blue-800 dark:text-blue-200' :
                          reputationData.status === 'annoying' ? 'text-orange-800 dark:text-orange-200' :
                          reputationData.status === 'dangerous' ? 'text-red-800 dark:text-red-200' :
                          'text-gray-800 dark:text-gray-200'
                        }`}>
                          {t(`phoneNumbers.reputation.statusDescriptions.${reputationData.status}`)}
                        </h3>
                        <p className={`text-sm font-medium ${
                          reputationData.status === 'safe' ? 'text-green-700 dark:text-green-300' :
                          reputationData.status === 'neutral' ? 'text-blue-700 dark:text-blue-300' :
                          reputationData.status === 'annoying' ? 'text-orange-700 dark:text-orange-300' :
                          reputationData.status === 'dangerous' ? 'text-red-700 dark:text-red-300' :
                          'text-gray-700 dark:text-gray-300'
                        }`}>
                          {t('phoneNumbers.reputation.statusDescriptions.reputationStatus')}
                        </p>
                      </div>
                    </div>
                    {reputationBadge && (
                      <Badge 
                        variant={reputationBadge.variant} 
                        className={`${reputationBadge.color} text-base px-4 py-2 font-bold shadow-md`}
                      >
                        {reputationBadge.text}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Danger Level Progress Bar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className={`text-sm font-semibold ${
                        reputationData.status === 'safe' ? 'text-green-800 dark:text-green-200' :
                        reputationData.status === 'neutral' ? 'text-blue-800 dark:text-blue-200' :
                        reputationData.status === 'annoying' ? 'text-orange-800 dark:text-orange-200' :
                        reputationData.status === 'dangerous' ? 'text-red-800 dark:text-red-200' :
                        'text-gray-800 dark:text-gray-200'
                      }`}>
                        {t('phoneNumbers.reputation.sections.dangerLevel')}
                      </Label>
                      <span className={`text-2xl font-bold ${
                        reputationData.status === 'safe' ? 'text-green-900 dark:text-green-100' :
                        reputationData.status === 'neutral' ? 'text-blue-900 dark:text-blue-100' :
                        reputationData.status === 'annoying' ? 'text-orange-900 dark:text-orange-100' :
                        reputationData.status === 'dangerous' ? 'text-red-900 dark:text-red-100' :
                        'text-gray-900 dark:text-gray-100'
                      }`}>
                        {reputationData.dangerLevel}%
                      </span>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-white bg-opacity-70 dark:bg-gray-800 dark:bg-opacity-70 rounded-full h-4 shadow-inner">
                        <div 
                          className={`h-4 rounded-full transition-all duration-700 shadow-sm ${
                            reputationData.dangerLevel >= 70 ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700' :
                            reputationData.dangerLevel >= 40 ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-yellow-600' :
                            reputationData.dangerLevel >= 10 ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600' : 
                            'bg-gradient-to-r from-green-500 via-green-600 to-emerald-600'
                          }`}
                          style={{ width: `${Math.max(reputationData.dangerLevel, 3)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Risk Level Indicators */}
                    <div className="flex justify-between text-xs font-medium pt-1">
                      <span className="text-green-600 dark:text-green-400">Safe (0-9%)</span>
                      <span className="text-blue-600 dark:text-blue-400">Neutral (10-39%)</span>
                      <span className="text-orange-600 dark:text-orange-400">Annoying (40-69%)</span>
                      <span className="text-red-600 dark:text-red-400">Dangerous (70%+)</span>
                    </div>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950/50 dark:to-blue-900/50 dark:border-blue-700">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-200 dark:bg-blue-800/50 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{t('phoneNumbers.reputation.stats.comments')}</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{reputationData.commentCount.toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-950/50 dark:to-purple-900/50 dark:border-purple-700">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-200 dark:bg-purple-800/50 rounded-lg">
                        <Eye className="h-5 w-5 text-purple-700 dark:text-purple-300" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">{t('phoneNumbers.reputation.stats.visits')}</p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{reputationData.visitCount.toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-950/50 dark:to-green-900/50 dark:border-green-700">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-200 dark:bg-green-800/50 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-green-700 dark:text-green-300" />
                      </div>
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-300 font-medium">{t('phoneNumbers.reputation.stats.trustScore')}</p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">{100 - reputationData.dangerLevel}%</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 dark:from-orange-950/50 dark:to-orange-900/50 dark:border-orange-700">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-200 dark:bg-orange-800/50 rounded-lg">
                        <Calendar className="h-5 w-5 text-orange-700 dark:text-orange-300" />
                      </div>
                      <div>
                        <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">{t('phoneNumbers.reputation.stats.lastVisit')}</p>
                        <p className="text-sm font-bold text-orange-900 dark:text-orange-100">
                          {reputationData.lastVisitDate ? formatDate(reputationData.lastVisitDate) : t('phoneNumbers.reputation.stats.unknown')}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Description Section */}
                {reputationData.description && (
                  <Card className="p-4 dark:bg-gray-800/50 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-3">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <Label className="text-sm font-semibold dark:text-gray-200">{t('phoneNumbers.reputation.sections.summary')}</Label>
                    </div>
                    <p className="text-sm text-muted-foreground dark:text-gray-300 leading-relaxed">{reputationData.description}</p>
                  </Card>
                )}

                {/* Categories Section */}
                {reputationData.categories && reputationData.categories.length > 0 && (
                  <Card className="p-4 dark:bg-gray-800/50 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-4">
                      <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <Label className="text-sm font-semibold dark:text-gray-200">{t('phoneNumbers.reputation.sections.categories')}</Label>
                    </div>
                    
                    {/* Categories Summary Bar */}
                    <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-lg border dark:border-slate-600">
                      <div className="flex flex-wrap gap-2 items-center justify-center">
                        {reputationData.categories.map((category, index) => (
                          <Badge 
                            key={index} 
                            className={`px-3 py-1.5 text-sm font-semibold ${
                              category.toLowerCase().includes('dangereux') ? 
                                'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600' :
                              category.toLowerCase().includes('gênant') ? 
                                'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-600' :
                              category.toLowerCase().includes('utile') || category.toLowerCase().includes('fiable') ? 
                                'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600' :
                              category.toLowerCase().includes('neutre') ? 
                                'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600' :
                                'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600'
                            }`}
                            variant="outline"
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Comments Section */}
                {reputationData.allComments && reputationData.allComments.length > 0 ? (
                  <Card className="p-4 dark:bg-gray-800/50 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-4">
                      <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <Label className="text-sm font-semibold dark:text-gray-200">{t('phoneNumbers.reputation.sections.comments')} ({reputationData.allComments.length})</Label>
                    </div>
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {reputationData.allComments.map((comment, index) => (
                        <div 
                          key={index} 
                          className="border rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-all duration-200 hover:border-blue-200 dark:border-gray-600 dark:hover:border-blue-500"
                        >
                          <div className="flex items-start justify-between mb-3">
                            {comment.category && (
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  className={`font-semibold px-3 py-1 text-sm transition-colors duration-200 ${
                                    comment.category.toLowerCase().startsWith('dangereux') ? 
                                      'bg-red-100 text-red-800 border-red-300 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/50' :
                                    comment.category.toLowerCase().startsWith('gênant') ? 
                                      'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-600 dark:hover:bg-orange-900/50' :
                                    comment.category.toLowerCase().startsWith('utile') || comment.category.toLowerCase().startsWith('fiable') ? 
                                      'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-900/50' :
                                    comment.category.toLowerCase().startsWith('neutre') ? 
                                      'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/50' :
                                      'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800/70'
                                  }`}
                                  variant="outline"
                                >
                                  {comment.category}
                                </Badge>
                              </div>
                            )}
                            {comment.date && (
                              <span className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 dark:text-gray-400">
                                {formatDate(comment.date)}
                              </span>
                            )}
                          </div>
                          <div className="ml-0">
                            <blockquote className="border-l-4 border-blue-200 dark:border-blue-500 pl-4 italic">
                              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
                                "{comment.text}"
                              </p>
                            </blockquote>
                          </div>
                          
                          {/* Add a subtle separator line for visual separation */}
                          {index < reputationData.allComments!.length - 1 && (
                            <hr className="mt-4 border-gray-100 dark:border-gray-700" />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Show pagination info if there are many comments */}
                    {reputationData.allComments.length > 10 && (
                      <div className="mt-3 text-center">
                        <p className="text-xs text-muted-foreground dark:text-gray-400">
                          {t('phoneNumbers.reputation.sections.showingComments', { 
                            showing: Math.min(10, reputationData.allComments.length).toString(), 
                            total: reputationData.allComments.length.toString() 
                          })}
                        </p>
                      </div>
                    )}
                  </Card>
                ) : reputationData.lastComment && (
                  <Card className="p-4 dark:bg-gray-800/50 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-3">
                      <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <Label className="text-sm font-semibold dark:text-gray-200">{t('phoneNumbers.reputation.sections.latestComment')}</Label>
                      {reputationData.lastCommentDate && (
                        <span className="text-xs text-muted-foreground dark:text-gray-400 ml-auto">
                          {formatDate(reputationData.lastCommentDate)}
                        </span>
                      )}
                    </div>
                    <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
                      <p className="text-sm leading-relaxed italic dark:text-gray-300">"{reputationData.lastComment}"</p>
                    </div>
                  </Card>
                )}

                {/* Source and Actions */}
                <Card className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 dark:border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('phoneNumbers.reputation.sections.source')}:</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{t('phoneNumbers.reputation.sources.pageJauneBelgium')}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(reputationData.sourceUrl, '_blank')}
                        className="flex items-center space-x-1 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>{t('phoneNumbers.reputation.actions.viewSource')}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckReputation(selectedNumberForReputation!, true)}
                        disabled={isCheckingReputation}
                        className="flex items-center space-x-1 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        {isCheckingReputation ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        <span>{t('phoneNumbers.reputation.actions.refresh')}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Shield className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2 dark:text-gray-200">{t('phoneNumbers.reputation.sections.noData')}</h3>
                <p className="text-muted-foreground dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {t('phoneNumbers.reputation.sections.noDataDescription')}
                </p>
                <Button
                  onClick={() => handleCheckReputation(selectedNumberForReputation!, true)}
                  disabled={isCheckingReputation}
                  className="px-6 py-2"
                >
                  {isCheckingReputation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('phoneNumbers.reputation.actions.checking')}
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      {t('phoneNumbers.reputation.modal.buttons.checkReputation')}
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="border-t pt-4 mt-6 flex-shrink-0">
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowReputationModal(false)} className="px-6">
                  {t('phoneNumbers.reputation.actions.close')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Request Modal */}
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.modals.cancelRequest.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.modals.cancelRequest.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">{t('phoneNumbers.modals.cancelRequest.form.reason.label')}</Label>
                <Select value={cancelForm.reason} onValueChange={(value) => setCancelForm({ ...cancelForm, reason: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('phoneNumbers.modals.cancelRequest.form.reason.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_longer_needed">{t('phoneNumbers.modals.cancelRequest.form.reason.options.noLongerNeeded')}</SelectItem>
                    <SelectItem value="cost_reduction">{t('phoneNumbers.modals.cancelRequest.form.reason.options.costReduction')}</SelectItem>
                    <SelectItem value="service_issues">{t('phoneNumbers.modals.cancelRequest.form.reason.options.serviceIssues')}</SelectItem>
                    <SelectItem value="business_closure">{t('phoneNumbers.modals.cancelRequest.form.reason.options.businessClosure')}</SelectItem>
                    <SelectItem value="other">{t('phoneNumbers.modals.cancelRequest.form.reason.options.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">{t('phoneNumbers.modals.cancelRequest.form.priority.label')}</Label>
                <Select value={cancelForm.priority} onValueChange={(value: RequestPriority) => setCancelForm({ ...cancelForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('phoneNumbers.modals.cancelRequest.form.priority.options.low')}</SelectItem>
                    <SelectItem value="medium">{t('phoneNumbers.modals.cancelRequest.form.priority.options.medium')}</SelectItem>
                    <SelectItem value="high">{t('phoneNumbers.modals.cancelRequest.form.priority.options.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="scheduledDate">{t('phoneNumbers.modals.cancelRequest.form.scheduledDate.label')}</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={cancelForm.scheduledDate || ''}
                  onChange={(e) => setCancelForm({ ...cancelForm, scheduledDate: e.target.value || undefined })}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('phoneNumbers.modals.cancelRequest.form.scheduledDate.helper')}</p>
              </div>
              
              <div>
                <Label htmlFor="description">{t('phoneNumbers.modals.cancelRequest.form.description.label')}</Label>
                <Textarea
                  id="description"
                  value={cancelForm.description}
                  onChange={(e) => setCancelForm({ ...cancelForm, description: e.target.value })}
                  placeholder={t('phoneNumbers.modals.cancelRequest.form.description.placeholder')}
                  rows={4}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                {t('phoneNumbers.modals.cancelRequest.buttons.cancel')}
              </Button>
              <Button
                onClick={handleCancelRequest}
                disabled={isSubmitting || !cancelForm.reason}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.modals.cancelRequest.buttons.submitting')}
                  </>
                ) : (
                  t('phoneNumbers.modals.cancelRequest.buttons.submit')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Cancel Modal */}
        <Dialog open={showBulkCancelModal} onOpenChange={setShowBulkCancelModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-600" />
                Bulk Cancel Phone Numbers
              </DialogTitle>
              <DialogDescription>
                You are about to submit cancellation requests for {selectedNumbers.size} phone number{selectedNumbers.size > 1 ? 's' : ''}. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Selected Numbers Preview */}
              <div>
                <h3 className="font-semibold mb-3">Selected Numbers ({selectedNumbers.size})</h3>
                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  <div className="grid gap-2 p-4">
                    {getSelectedNumbers().map((number) => (
                      <div key={number._id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex-1">
                          <div className="font-mono font-medium">{number.number}</div>
                          <div className="text-sm text-muted-foreground">
                            {number.country} • {number.numberType}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-red-600">
                            {number.monthlyRate ? `€${number.monthlyRate.toFixed(2)}/mo` : 'Free'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bulk Cancel Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-reason">Cancellation Reason</Label>
                  <Select value={bulkCancelForm.reason} onValueChange={(value) => setBulkCancelForm({ ...bulkCancelForm, reason: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason for cancellation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_longer_needed">No longer needed</SelectItem>
                      <SelectItem value="cost_reduction">Cost reduction</SelectItem>
                      <SelectItem value="service_issues">Service issues</SelectItem>
                      <SelectItem value="business_closure">Business closure</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="bulk-priority">Priority</Label>
                  <Select value={bulkCancelForm.priority} onValueChange={(value: RequestPriority) => setBulkCancelForm({ ...bulkCancelForm, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="bulk-scheduledDate">Scheduled Date (Optional)</Label>
                  <Input
                    id="bulk-scheduledDate"
                    type="date"
                    value={bulkCancelForm.scheduledDate || ''}
                    onChange={(e) => setBulkCancelForm({ ...bulkCancelForm, scheduledDate: e.target.value ? e.target.value : undefined })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty for immediate processing</p>
                </div>
                
                <div>
                  <Label htmlFor="bulk-description">Additional Notes (Optional)</Label>
                  <Textarea
                    id="bulk-description"
                    value={bulkCancelForm.description}
                    onChange={(e) => setBulkCancelForm({ ...bulkCancelForm, description: e.target.value })}
                    placeholder="Add any additional details about the cancellation..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Warning */}
              <Alert className="border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-700">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 dark:text-red-300">
                  <strong>Important:</strong> This will submit {selectedNumbers.size} individual cancellation request{selectedNumbers.size > 1 ? 's' : ''}. 
                  Each request will need to be processed separately and may take time to complete.
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowBulkCancelModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkCancel}
                disabled={isBulkCancelling || !bulkCancelForm.reason || selectedNumbers.size === 0}
                className="bg-red-600 hover:bg-red-700"
              >
                {isBulkCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting Requests...
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Submit {selectedNumbers.size} Cancellation Request{selectedNumbers.size > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </MainLayout>
  );
} 