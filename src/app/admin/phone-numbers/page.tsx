'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Hash, 
  Search,
  Plus,
  Trash2,
  Eye,
  UserPlus,
  UserMinus,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Ban,
  Pause,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  MoreVertical,
  Copy,
  ExternalLink,
  RefreshCw,
  BarChart3,
  Info,
  Tag,
  MessageCircle,
  MessageSquare,
  Calendar,
  Globe,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { formatDate, formatCurrency } from '@/lib/utils';
import { PhoneNumber, PhoneNumberFilters, CreatePhoneNumberForm, AssignPhoneNumberForm, PhoneNumberType, PhoneNumberCapability, PhoneNumberStatus, BillingCycle, ConnectionType } from '@/types/phoneNumber';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslations } from '@/lib/i18n';

interface User {
  _id: string;
  name?: string;
  email: string;
  company?: string;
  onboarding?: {
    companyName?: string;
  };
}

// Rate deck interfaces removed - rate decks are now assigned to users, not phone numbers

interface Country {
  _id: string;
  name: string;
  code: string;
  phoneCode: string;
}

interface Provider {
  _id: string;
  name: string;
  description?: string;
  services: string[];
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

// Bulk reputation progress interface
interface BulkReputationProgress {
  total: number;
  completed: number;
  current: string;
  isRunning: boolean;
  results: Record<string, { success: boolean; status?: ReputationData['status']; error?: string; }>;
}

export default function AdminPhoneNumbersPage() {
  const { t, isLoading: isTranslationsLoading } = useTranslations();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  // Rate deck options removed - rate decks are now assigned to users, not phone numbers
  const [countries, setCountries] = useState<Country[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkUnassignModal, setShowBulkUnassignModal] = useState(false);
  const [showBulkUnassignConfirm, setShowBulkUnassignConfirm] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUnreserveModal, setShowUnreserveModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [selectedNumberDetails, setSelectedNumberDetails] = useState<PhoneNumber | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Bulk selection states
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [isSelectAllChecked, setIsSelectAllChecked] = useState(false);
  
  // Copy button states
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  // Reputation states
  const [showReputationModal, setShowReputationModal] = useState(false);
  const [reputationData, setReputationData] = useState<ReputationData | null>(null);
  const [reputationBadge, setReputationBadge] = useState<ReputationBadge | null>(null);
  const [isCheckingReputation, setIsCheckingReputation] = useState(false);
  const [reputationHasData, setReputationHasData] = useState(false);
  const [selectedNumberForReputation, setSelectedNumberForReputation] = useState<PhoneNumber | null>(null);
  const [showBulkReputationModal, setShowBulkReputationModal] = useState(false);
  const [bulkReputationProgress, setBulkReputationProgress] = useState<BulkReputationProgress>({
    total: 0,
    completed: 0,
    current: '',
    isRunning: false,
    results: {}
  });

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    total: number;
    success: number;
    errors: Array<{ row: number; error: string; data?: any }>;
  } | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [importDefaults, setImportDefaults] = useState({
    country: '',
    provider: '',
    numberType: '',
    currency: '',
    capabilities: [] as PhoneNumberCapability[],
    connectionType: undefined as ConnectionType | undefined
  });
  
  // Track reputation data for all phone numbers
  const [phoneNumberReputations, setPhoneNumberReputations] = useState<Record<string, {
    status: ReputationData['status'];
    dangerLevel: number;
    hasData: boolean;
    isLoading: boolean;
  }>>({});
  
  // Filter states
  const [filters, setFilters] = useState<PhoneNumberFilters>({
    search: '',
    status: undefined,
    country: undefined,
    numberType: undefined,
    assignedTo: undefined,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Form states
  const [createForm, setCreateForm] = useState<CreatePhoneNumberForm>({
    number: '',
    country: '',
    countryCode: '',
    numberType: 'Geographic/Local' as PhoneNumberType,
    provider: '',
    // rateDeckId removed - rate decks are assigned to users, not phone numbers
    currency: 'USD',
    backorderOnly: false,
    billingCycle: 'monthly',
    billingDayOfMonth: 1,
    capabilities: ['voice'] as PhoneNumberCapability[],
    // Technical connection parameters
    connectionType: undefined,
    ipAddress: '',
    port: undefined,
    login: '',
    password: '',
    domain: '',
    credentialsPort: undefined
  });
  
  const [assignForm, setAssignForm] = useState<AssignPhoneNumberForm>({
    userId: '',
    billingStartDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [unassignForm, setUnassignForm] = useState({
    reason: '',
    cancelPendingBilling: true,
    createRefund: false,
    refundAmount: 0
  });

  const [editForm, setEditForm] = useState<CreatePhoneNumberForm>({
    number: '',
    country: '',
    countryCode: '',
    numberType: 'Geographic/Local' as PhoneNumberType,
    provider: '',
    // rateDeckId removed - rate decks are assigned to users, not phone numbers
    currency: 'USD',
    backorderOnly: false,
    billingCycle: 'monthly',
    billingDayOfMonth: 1,
    capabilities: ['voice'] as PhoneNumberCapability[],
    // Technical connection parameters
    connectionType: undefined,
    ipAddress: '',
    port: undefined,
    login: '',
    password: '',
    domain: '',
    credentialsPort: undefined
  });

  const [reserveForm, setReserveForm] = useState({
    reason: '',
    reservedUntil: '',
    notes: ''
  });

  const [suspendForm, setSuspendForm] = useState({
    reason: '',
    suspendBilling: true,
    autoResumeDate: '',
    notes: ''
  });

  const [cancelForm, setCancelForm] = useState({
    reason: '',
    cancelBilling: true,
    createRefund: false,
    refundAmount: 0,
    gracePeriodDays: 30,
    notes: ''
  });

  const [unreserveForm, setUnreserveForm] = useState({
    reason: '',
    notes: ''
  });

  const handleCopyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      toast.success(t('phoneNumbers.admin.messages.success.copied'));
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch {
      toast.error(t('phoneNumbers.admin.messages.error.copyFailed'));
    }
  };

  const fetchPhoneNumbers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/admin/phone-numbers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers');
      }
      
      const data = await response.json();
      setPhoneNumbers(data.phoneNumbers || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
              console.error('Error fetching phone numbers:', error);
        toast.error(t('phoneNumbers.admin.messages.error.loadNumbers'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPhoneNumbers();
    fetchUsers();
    // fetchRateDecks() removed - rate decks are now assigned to users, not phone numbers
    fetchCountries();
    fetchProviders();
  }, [filters, fetchPhoneNumbers]);

  // Clear selections when phone numbers data changes
  useEffect(() => {
    setSelectedNumbers(new Set());
    setIsSelectAllChecked(false);
  }, [phoneNumbers]);

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

  // Function to check reputation for phone number without opening modal
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
      // Use admin API endpoint to check stored reputation data
      const storedResponse = await fetch(`/api/admin/phone-numbers/${number._id}/reputation`);
      if (storedResponse.ok) {
        const storedData = await storedResponse.json();
        if (storedData.hasData && storedData.reputation) {
          setPhoneNumberReputations(prev => ({
            ...prev,
            [phoneNumber]: {
              status: storedData.reputation.status === 'unknown' ? 'safe' : storedData.reputation.status,
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
          status: 'safe', // Treat unknown as safe
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
          status: 'safe', // Treat unknown as safe
          dangerLevel: 0,
          hasData: false,
          isLoading: false
        }
      }));
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=100&includeOnboarding=true');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // fetchRateDecks function removed - rate decks are now assigned to users, not phone numbers

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/admin/countries?isActive=true&limit=1000');
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/admin/providers?isActive=true&limit=1000');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const handleCreatePhoneNumber = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberCreated'));
      setShowCreateModal(false);
      resetCreateForm();
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error creating phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.createNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignPhoneNumber = async () => {
    if (!selectedNumber) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberAssigned'));
      setShowAssignModal(false);
      setAssignForm({
        userId: '',
        billingStartDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setSelectedNumber(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error assigning phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.assignNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassignPhoneNumber = async () => {
    if (!selectedNumber) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unassignForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unassign phone number');
      }

      await response.json();
      toast.success(t('phoneNumbers.admin.messages.success.numberUnassigned'));
      setShowUnassignModal(false);
      setUnassignForm({
        reason: '',
        cancelPendingBilling: true,
        createRefund: false,
        refundAmount: 0
      });
      
      // Refresh the phone number details if details modal is open
      if (showDetailsModal && selectedNumber) {
        await fetchPhoneNumberDetails(selectedNumber._id);
      }
      
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error unassigning phone number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unassign phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPhoneNumber = async () => {
    if (!selectedNumber) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberUpdated'));
      setShowEditModal(false);
      setSelectedNumber(null);
      fetchPhoneNumbers(); // Refresh the list
    } catch (error) {
      console.error('Error updating phone number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePhoneNumber = async (id: string) => {
    if (!confirm('Are you sure you want to delete this phone number?')) return;

    try {
      const response = await fetch(`/api/admin/phone-numbers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberDeleted'));
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error deleting phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.deleteNumber'));
    }
  };

  // Bulk selection handlers
  const handleSelectNumber = (numberId: string, checked: boolean) => {
    const newSelected = new Set(selectedNumbers);
    if (checked) {
      newSelected.add(numberId);
    } else {
      newSelected.delete(numberId);
    }
    setSelectedNumbers(newSelected);
    
    // Update select all state
    setIsSelectAllChecked(newSelected.size === phoneNumbers.length && phoneNumbers.length > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(phoneNumbers.map(number => number._id));
      setSelectedNumbers(allIds);
      setIsSelectAllChecked(true);
    } else {
      setSelectedNumbers(new Set());
      setIsSelectAllChecked(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!assignForm.userId) return;
    
    const availableNumbers = phoneNumbers.filter(number => 
      selectedNumbers.has(number._id) && number.status === 'available'
    );
    
    if (availableNumbers.length === 0) {
      toast.error('No available numbers selected for assignment');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Process assignments in parallel
      const assignmentPromises = availableNumbers.map(number =>
        fetch(`/api/admin/phone-numbers/${number._id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignForm),
        })
      );

      const results = await Promise.allSettled(assignmentPromises);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      if (successful > 0) {
        toast.success(t('phoneNumbers.admin.messages.success.bulkAssigned'));
      }
      if (failed > 0) {
        toast.error(`${failed} phone numbers failed to assign`);
      }
      
      setShowBulkAssignModal(false);
      setSelectedNumbers(new Set());
      setIsSelectAllChecked(false);
      setAssignForm({
        userId: '',
        billingStartDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error bulk assigning phone numbers:', error);
      toast.error('Failed to assign phone numbers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    const deletableNumbers = phoneNumbers.filter(number => 
      selectedNumbers.has(number._id) && number.status !== 'assigned'
    );
    
    if (deletableNumbers.length === 0) {
      toast.error('No deletable numbers selected (assigned numbers cannot be deleted)');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${deletableNumbers.length} phone numbers? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Process deletions in parallel
      const deletionPromises = deletableNumbers.map(number =>
        fetch(`/api/admin/phone-numbers/${number._id}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.allSettled(deletionPromises);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      if (successful > 0) {
        toast.success(t('phoneNumbers.admin.messages.success.bulkDeleted'));
      }
      if (failed > 0) {
        toast.error(`${failed} phone numbers failed to delete`);
      }
      
      setSelectedNumbers(new Set());
      setIsSelectAllChecked(false);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error bulk deleting phone numbers:', error);
      toast.error('Failed to delete phone numbers');
    } finally {
      setIsSubmitting(false);
    }
  };



  const confirmBulkUnassign = async () => {
    const assignedNumbers = phoneNumbers.filter(number => 
      selectedNumbers.has(number._id) && number.status === 'assigned'
    );

    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/admin/phone-numbers/bulk-unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberIds: assignedNumbers.map(number => number._id),
          reason: unassignForm.reason || 'Bulk unassigned by admin',
          cancelPendingBilling: unassignForm.cancelPendingBilling,
          createRefund: unassignForm.createRefund,
          refundAmount: unassignForm.refundAmount,
        }),
      });

      const result = await response.json();
      
      if (result.summary.successful > 0) {
        toast.success(`${result.summary.successful} phone numbers unassigned successfully`);
      }
      if (result.summary.failed > 0) {
        toast.error(`${result.summary.failed} phone numbers failed to unassign`);
      }
      
      setShowBulkUnassignModal(false);
      setShowBulkUnassignConfirm(false);
      setSelectedNumbers(new Set());
      setIsSelectAllChecked(false);
      setUnassignForm({
        reason: '',
        cancelPendingBilling: true,
        createRefund: false,
        refundAmount: 0
      });
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error bulk unassigning phone numbers:', error);
      toast.error('Failed to unassign phone numbers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchPhoneNumberDetails = async (phoneNumberId: string) => {
    try {
      setIsLoadingDetails(true);
      const response = await fetch(`/api/admin/phone-numbers/${phoneNumberId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch phone number details');
      }
      
      const data = await response.json();
      setSelectedNumberDetails(data);
    } catch (error) {
      console.error('Error fetching phone number details:', error);
      toast.error('Failed to load phone number details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      number: '',
      country: '',
      countryCode: '',
      numberType: 'Geographic/Local' as PhoneNumberType,
      provider: '',
      // rateDeckId removed - rate decks are assigned to users, not phone numbers
      currency: 'USD',
      backorderOnly: false,
      billingCycle: 'monthly',
      billingDayOfMonth: 1,
      capabilities: ['voice'] as PhoneNumberCapability[],
      // Technical connection parameters
      connectionType: undefined,
      ipAddress: '',
      port: undefined,
      login: '',
      password: '',
      domain: '',
      credentialsPort: undefined
    });
  };

  const updateFilters = (newFilters: Partial<PhoneNumberFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const changePage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'assigned': return 'secondary';
      case 'reserved': return 'outline';
      case 'suspended': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />;
      case 'assigned': return <UserPlus className="h-4 w-4" />;
      case 'reserved': return <Clock className="h-4 w-4" />;
      case 'suspended': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Helper function to parse audit trail
  const parseAuditTrail = (notes: string) => {
    if (!notes) return [];
    
    const entries = notes.split('\n\n').filter(entry => entry.trim());
    return entries.map((entry, index) => {
      const lines = entry.split('\n');
      const firstLine = lines[0] || '';
      
      // Extract action type and basic info
      let actionType = 'OTHER';
      let actionIcon = <AlertCircle className="h-4 w-4" />;
      let actionColor = 'gray';
      
      if (firstLine.includes('RESERVED')) {
        actionType = 'RESERVED';
        actionIcon = <Shield className="h-4 w-4" />;
        actionColor = 'blue';
      } else if (firstLine.includes('UNRESERVED')) {
        actionType = 'UNRESERVED';
        actionIcon = <Shield className="h-4 w-4" />;
        actionColor = 'green';
      } else if (firstLine.includes('SUSPENDED')) {
        actionType = 'SUSPENDED';
        actionIcon = <Pause className="h-4 w-4" />;
        actionColor = 'orange';
      } else if (firstLine.includes('CANCELLED')) {
        actionType = 'CANCELLED';
        actionIcon = <Ban className="h-4 w-4" />;
        actionColor = 'red';
      } else if (firstLine.includes('ASSIGNED')) {
        actionType = 'ASSIGNED';
        actionIcon = <UserPlus className="h-4 w-4" />;
        actionColor = 'green';
      } else if (firstLine.includes('UNASSIGNED')) {
        actionType = 'UNASSIGNED';
        actionIcon = <UserMinus className="h-4 w-4" />;
        actionColor = 'orange';
      }
      
      // Extract timestamp
      const timestampMatch = firstLine.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      const timestamp = timestampMatch ? timestampMatch[1] : '';
      
      // Extract user
      const userMatch = firstLine.match(/by ([^\s]+)/);
      const user = userMatch ? userMatch[1] : 'Unknown';
      
      // Extract reason
      const reasonLine = lines.find(line => line.startsWith('Reason:'));
      const reason = reasonLine ? reasonLine.replace('Reason:', '').trim() : '';
      
      // Extract notes
      const notesLine = lines.find(line => line.startsWith('Notes:'));
      const notes = notesLine ? notesLine.replace('Notes:', '').trim() : '';
      
      // Extract additional details
      const details = lines.filter(line => 
        !line.includes(actionType) && 
        !line.startsWith('Reason:') && 
        !line.startsWith('Notes:') &&
        line.trim()
      );
      
      return {
        id: index,
        actionType,
        actionIcon,
        actionColor,
        timestamp,
        user,
        reason,
        notes,
        details,
        fullEntry: entry
      };
    }).reverse(); // Reverse to show newest first
  };

  const handleReservePhoneNumber = async () => {
    if (!selectedNumber) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reserveForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reserve phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberReserved'));
      setShowReserveModal(false);
      setReserveForm({ reason: '', reservedUntil: '', notes: '' });
      setSelectedNumber(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error reserving phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.reserveNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspendPhoneNumber = async () => {
    if (!selectedNumber) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(suspendForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to suspend phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberSuspended'));
      setShowSuspendModal(false);
      setSuspendForm({ reason: '', suspendBilling: true, autoResumeDate: '', notes: '' });
      setSelectedNumber(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error suspending phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.suspendNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPhoneNumber = async () => {
    if (!selectedNumber) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancelForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel phone number');
      }

      const result = await response.json();
      toast.success(t('phoneNumbers.admin.messages.success.numberCancelled'));
      if (result.gracePeriodDays > 0) {
        toast.info(`Number will be permanently deleted after ${result.gracePeriodDays} days`);
      }
      
      setShowCancelModal(false);
      setCancelForm({ reason: '', cancelBilling: true, createRefund: false, refundAmount: 0, gracePeriodDays: 30, notes: '' });
      setSelectedNumber(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error cancelling phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.cancelNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnreservePhoneNumber = async () => {
    if (!selectedNumber) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/unreserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(unreserveForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unreserve phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberUnreserved'));
      
      setShowUnreserveModal(false);
      setUnreserveForm({ reason: '', notes: '' });
      setSelectedNumber(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error unreserving phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.unreserveNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportPhoneNumbers = async () => {
    if (!importFile) return;

    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportResults(null);

      // Get the detected delimiter
      const fileContent = await importFile.text();
      const delimiter = detectDelimiter(fileContent);

      // Prepare import configuration
      const importConfig = {
        columnMapping,
        importDefaults: {
          ...importDefaults,
          // Convert country and provider IDs to actual names/values
          country: countries.find(c => c._id === importDefaults.country)?.name || '',
          countryCode: countries.find(c => c._id === importDefaults.country)?.code || '',
          provider: providers.find(p => p._id === importDefaults.provider)?.name || '',
        },
        delimiter,
        csvHeaders
      };

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('config', JSON.stringify(importConfig));

      const response = await fetch('/api/admin/phone-numbers/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to import phone numbers');
      }

      const result = await response.json();
      setImportResults(result);
      
      if (result.success === result.total) {
        toast.success(`Successfully imported ${result.success} phone numbers`);
      } else {
        toast.warning(`Imported ${result.success} of ${result.total} phone numbers. ${result.errors.length} errors.`);
      }
      
      await fetchPhoneNumbers();
    } catch (error) {
      console.error('Error importing phone numbers:', error);
      toast.error('Failed to import phone numbers');
    } finally {
      setIsImporting(false);
      setImportProgress(100);
    }
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportProgress(0);
    setImportResults(null);
    setIsImporting(false);
    setCsvHeaders([]);
    setColumnMapping({});
    setShowColumnMapping(false);
    setImportDefaults({
      country: '',
      provider: '',
      numberType: '',
      currency: '',
      capabilities: [],
      connectionType: undefined
    });
  };

  const detectDelimiter = (content: string): string => {
    // Get first few lines to analyze
    const lines = content.split('\n').slice(0, 5);
    const delimiters = [',', ';', '\t', '|', ':'];
    const delimiterCounts: Record<string, number> = {};
    
    // Count occurrences of each delimiter
    delimiters.forEach(delimiter => {
      delimiterCounts[delimiter] = 0;
      lines.forEach(line => {
        // Count delimiter occurrences in this line
        const matches = line.split(delimiter).length - 1;
        delimiterCounts[delimiter] += matches;
      });
    });
    
    // Find the delimiter with the most consistent count across lines
    let bestDelimiter = ',';
    let maxCount = 0;
    
    delimiters.forEach(delimiter => {
      const count = delimiterCounts[delimiter];
      if (count > maxCount && count > 0) {
        // Verify consistency across lines
        const countsPerLine = lines.map(line => line.split(delimiter).length - 1);
        const isConsistent = countsPerLine.every(count => count === countsPerLine[0] && count > 0);
        
        if (isConsistent || count > maxCount * 1.5) {
          maxCount = count;
          bestDelimiter = delimiter;
        }
      }
    });
    
    return bestDelimiter;
  };

  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
  };

  const handleFileUpload = async (file: File) => {
    setImportFile(file);
    
    try {
      const fileContent = await file.text();
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        // Detect delimiter automatically
        const delimiter = detectDelimiter(fileContent);
        console.log('Detected delimiter:', delimiter === '\t' ? 'TAB' : delimiter);
        
        // Parse headers with detected delimiter
        const headers = parseCSVLine(lines[0], delimiter);
        setCsvHeaders(headers);
        
        // Auto-match columns
        const autoMapping = autoMatchColumns(headers);
        setColumnMapping(autoMapping);
        setShowColumnMapping(true);
        
        // Show success message with detected format
        const delimiterName = delimiter === '\t' ? 'tab' : 
                            delimiter === ';' ? 'semicolon' : 
                            delimiter === '|' ? 'pipe' : 
                            delimiter === ':' ? 'colon' : 'comma';
        toast.success(`CSV file parsed successfully (${delimiterName}-separated)`);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read CSV file');
    }
  };

  const autoMatchColumns = (headers: string[]): Record<string, string> => {
    const fieldMappings: Record<string, string[]> = {
      number: ['number', 'phone', 'phonenumber', 'phone_number', 'msisdn', 'tel'],
      description: ['description', 'desc', 'notes', 'comment'],
      region: ['region', 'area', 'zone'],
      timeZone: ['timezone', 'time_zone', 'tz'],
      // Connection fields
      ipAddress: ['ip', 'ipaddress', 'ip_address', 'host', 'server'],
      port: ['port', 'sip_port', 'sipport'],
      login: ['login', 'username', 'user', 'auth', 'account'],
      password: ['password', 'pass', 'pwd', 'secret'],
      domain: ['domain', 'sip_domain', 'sipdomain', 'realm'],
      credentialsPort: ['credentialsport', 'credentials_port', 'auth_port', 'authport'],
    };

    const mapping: Record<string, string> = {};
    
    // Try to auto-match each field
    Object.entries(fieldMappings).forEach(([field, variations]) => {
      const matchedHeader = headers.find(header => 
        variations.some(variation => 
          header.toLowerCase().includes(variation.toLowerCase()) ||
          variation.toLowerCase().includes(header.toLowerCase())
        )
      );
      
      if (matchedHeader) {
        mapping[field] = matchedHeader;
      }
    });

    return mapping;
  };

  const areRequiredFieldsMapped = (): boolean => {
    // Check if phone number is mapped from CSV
    const phoneNumberMapped: boolean = !!(columnMapping['number'] && columnMapping['number'].trim() !== '');
    
    // Check if all required system options are selected
    const systemOptionsComplete: boolean = !!(importDefaults.country.trim() !== '' && 
                                             importDefaults.provider.trim() !== '' && 
                                             importDefaults.numberType.trim() !== '' && 
                                             importDefaults.currency.trim() !== '' &&
                                             importDefaults.capabilities.length > 0);
    
    return phoneNumberMapped && systemOptionsComplete;
  };

  // Reputation functions
  const handleCheckReputation = async (number: PhoneNumber, forceRefresh: boolean = false) => {
    setSelectedNumber(number);
    setIsCheckingReputation(true);
    setReputationData(null);
    setReputationBadge(null);
    setReputationHasData(false);

    try {
      // First, check if we have stored data (unless forcing refresh)
      if (!forceRefresh) {
        const storedResponse = await fetch(`/api/admin/phone-numbers/${number._id}/reputation`);
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

      // If no stored data or force refresh, fetch new data using admin endpoint
      const response = await fetch(`/api/admin/phone-numbers/${number._id}/reputation`, {
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
        toast.error(data.error || 'Failed to analyze reputation');
        if (data.details) {
          console.warn('Reputation check details:', data.details);
        }
      }
    } catch (error) {
      console.error('Error checking reputation:', error);
      toast.error('Failed to analyze reputation');
    } finally {
      setIsCheckingReputation(false);
    }
  };

  // Perform individual reputation analysis
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
      const response = await fetch(`/api/admin/phone-numbers/${number._id}/reputation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: true })
      });

      const data = await response.json();

      if (data.success && data.reputation) {
        setPhoneNumberReputations(prev => ({
          ...prev,
          [phoneNumber]: {
            status: data.reputation.status === 'unknown' ? 'safe' : data.reputation.status,
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
            status: 'safe', // Treat unknown as safe
            dangerLevel: 0,
            hasData: false,
            isLoading: false
          }
        }));
        toast.error('Failed to analyze reputation');
      }
    } catch (error) {
      console.error('Error performing reputation analysis:', error);
      setPhoneNumberReputations(prev => ({
        ...prev,
        [phoneNumber]: {
          status: 'safe', // Treat unknown as safe
          dangerLevel: 0,
          hasData: false,
          isLoading: false
        }
      }));
      toast.error('Failed to analyze reputation');
    }
  };

  // Bulk reputation check with random intervals
  const handleBulkReputationCheck = async () => {
    const selectedPhoneNumbers = phoneNumbers.filter(number => selectedNumbers.has(number._id));
    
    if (selectedPhoneNumbers.length === 0) {
      toast.error('Please select phone numbers to check');
      return;
    }

    const confirmMessage = `Are you sure you want to check reputation for ${selectedPhoneNumbers.length} phone numbers? This will take approximately ${Math.round(selectedPhoneNumbers.length * 5.5 / 60)} minutes.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setBulkReputationProgress({
      total: selectedPhoneNumbers.length,
      completed: 0,
      current: '',
      isRunning: true,
      results: {}
    });
    setShowBulkReputationModal(true);

    const results: Record<string, { success: boolean; status?: ReputationData['status']; error?: string; }> = {};

    for (let i = 0; i < selectedPhoneNumbers.length; i++) {
      const number = selectedPhoneNumbers[i];
      const phoneNumber = number.number;

      setBulkReputationProgress(prev => ({
        ...prev,
        current: phoneNumber,
        completed: i
      }));

      try {
        const response = await fetch(`/api/admin/phone-numbers/${number._id}/reputation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceRefresh: true })
        });

        const data = await response.json();

        if (data.success && data.reputation) {
          results[phoneNumber] = {
            success: true,
            status: data.reputation.status
          };
          
          // Update the phone number reputation cache
          setPhoneNumberReputations(prev => ({
            ...prev,
            [phoneNumber]: {
              status: data.reputation.status === 'unknown' ? 'safe' : data.reputation.status,
              dangerLevel: data.reputation.dangerLevel,
              hasData: true,
              isLoading: false
            }
          }));
        } else {
          results[phoneNumber] = {
            success: false,
            error: data.error || 'Unknown error'
          };
        }
      } catch (error) {
        console.error(`Error checking reputation for ${phoneNumber}:`, error);
        results[phoneNumber] = {
          success: false,
          error: 'Network error'
        };
      }

      // Update results
      setBulkReputationProgress(prev => ({
        ...prev,
        results: { ...results }
      }));

      // Random delay between 3-8 seconds (except for the last item)
      if (i < selectedPhoneNumbers.length - 1) {
        const delay = Math.random() * 5000 + 3000; // 3-8 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setBulkReputationProgress(prev => ({
      ...prev,
      completed: selectedPhoneNumbers.length,
      current: '',
      isRunning: false
    }));

    const successCount = Object.values(results).filter(r => r.success).length;
    toast.success(`Bulk reputation check completed. ${successCount}/${selectedPhoneNumbers.length} numbers processed successfully.`);
  };

  const getReputationIcon = (status: ReputationData['status']) => {
    switch (status) {
      case 'safe':
      case 'unknown': // Treat unknown as safe
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

  const getReputationBadgeClasses = (status: ReputationData['status']) => {
    switch (status) {
      case 'safe':
      case 'unknown': // Treat unknown as safe
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
    // Treat unknown status as safe
    const displayStatus = status === 'unknown' ? 'safe' : status;
    const translationKey = `phoneNumbers.reputation.displayText.${displayStatus}`;
    return t(translationKey, { dangerLevel: dangerLevel.toString() });
  };

  // Helper function to normalize status (treat unknown as safe)
  const normalizeReputationStatus = (status: ReputationData['status']) => {
    return status === 'unknown' ? 'safe' : status;
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

  // Export functionality
  const handleExportPhoneNumbers = async () => {
    try {
      setIsSubmitting(true);
      
      // Create export parameters for server-side processing
      const exportParams = new URLSearchParams();
      exportParams.append('export', 'csv');
      exportParams.append('allData', 'true'); // Request all data from database
      
      // Add filters to params for server-side filtering
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'page' && key !== 'limit') {
          if (Array.isArray(value)) {
            value.forEach(v => exportParams.append(key, v.toString()));
          } else {
            exportParams.append(key, value.toString());
          }
        }
      });

      // Make request to export endpoint
      const response = await fetch('/api/admin/phone-numbers/export?' + exportParams.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export phone numbers');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `phone-numbers-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(t('phoneNumbers.admin.export.success'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('phoneNumbers.admin.export.error'));
    } finally {
      setIsSubmitting(false);
    }
  };



  // Show loading spinner while auth or translations are loading
  if (isAuthLoading || isTranslationsLoading) {
    return (
      <MainLayout>
        <PageLayout
          title={t('phoneNumbers.admin.page.loading.title')}
          description={t('phoneNumbers.admin.page.loading.description')}
          breadcrumbs={[
            { label: t('phoneNumbers.admin.page.breadcrumbs.dashboard'), href: '/dashboard' },
            { label: t('phoneNumbers.admin.page.breadcrumbs.admin'), href: '/admin' },
            { label: t('phoneNumbers.admin.page.breadcrumbs.phoneNumbers') }
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
          title={t('phoneNumbers.admin.page.accessDenied.title')}
          description={t('phoneNumbers.admin.page.accessDenied.description')}
          breadcrumbs={[
            { label: t('phoneNumbers.admin.page.breadcrumbs.dashboard'), href: '/dashboard' },
            { label: t('phoneNumbers.admin.page.breadcrumbs.phoneNumbers') }
          ]}
        >
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('phoneNumbers.admin.page.accessDenied.message')}
            </AlertDescription>
          </Alert>
        </PageLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageLayout
        title={t('phoneNumbers.admin.page.title')}
        description={t('phoneNumbers.admin.page.description')}
        breadcrumbs={[
          { label: t('phoneNumbers.admin.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('phoneNumbers.admin.page.breadcrumbs.admin'), href: '/admin' },
          { label: t('phoneNumbers.admin.page.breadcrumbs.phoneNumbers') }
        ]}
        headerActions={
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('phoneNumbers.admin.actions.addNumber')}
              </Button>
            </DialogTrigger>
          </Dialog>
        }
      >
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('phoneNumbers.admin.filters.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t('phoneNumbers.admin.filters.searchPlaceholder')}
                  value={filters.search || ''}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
              
              <Select value={Array.isArray(filters.status) ? filters.status[0] || 'all' : filters.status || 'all'} onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : [value] as PhoneNumberStatus[] })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.admin.filters.statuses.all')} />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { id: 'all', label: t('phoneNumbers.admin.filters.statuses.all'), value: 'all' },
                    { id: 'available', label: t('phoneNumbers.admin.filters.statuses.available'), value: 'available' },
                    { id: 'assigned', label: t('phoneNumbers.admin.filters.statuses.assigned'), value: 'assigned' },
                    { id: 'reserved', label: t('phoneNumbers.admin.filters.statuses.reserved'), value: 'reserved' },
                    { id: 'suspended', label: t('phoneNumbers.admin.filters.statuses.suspended'), value: 'suspended' },
                    { id: 'cancelled', label: t('phoneNumbers.admin.filters.statuses.cancelled'), value: 'cancelled' }
                  ].map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={Array.isArray(filters.country) ? filters.country[0] || 'all' : filters.country || 'all'} onValueChange={(value) => updateFilters({ country: value === 'all' ? undefined : [value] })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.admin.filters.countries.all')} />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { id: 'all', label: t('phoneNumbers.admin.filters.countries.all'), value: 'all' },
                    ...countries
                      .filter(country => country._id) // Filter out countries with undefined/null IDs
                      .map((country, index) => ({
                        id: `country-${country._id || index}`,
                        label: `${country.name} (+${country.phoneCode})`,
                        value: country.name
                      }))
                  ].map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={Array.isArray(filters.numberType) ? filters.numberType[0] || 'all' : filters.numberType || 'all'} onValueChange={(value) => updateFilters({ numberType: value === 'all' ? undefined : [value] as PhoneNumberType[] })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.admin.filters.types.all')} />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { id: 'all', label: t('phoneNumbers.admin.filters.types.all'), value: 'all' },
                    { id: 'geographic', label: t('phoneNumbers.admin.filters.types.geographic'), value: 'Geographic/Local' },
                    { id: 'mobile', label: t('phoneNumbers.admin.filters.types.mobile'), value: 'Mobile' },
                    { id: 'national', label: t('phoneNumbers.admin.filters.types.national'), value: 'National' },
                    { id: 'tollfree', label: t('phoneNumbers.admin.filters.types.tollfree'), value: 'Toll-free' },
                    { id: 'shared', label: t('phoneNumbers.admin.filters.types.shared'), value: 'Shared Cost' },
                    { id: 'npv', label: t('phoneNumbers.admin.filters.types.npv'), value: 'NPV (Verified Numbers)' },
                    { id: 'premium', label: t('phoneNumbers.admin.filters.types.premium'), value: 'Premium' }
                  ].map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.assignedTo || 'all'} onValueChange={(value) => updateFilters({ assignedTo: value === 'all' ? undefined : value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.admin.filters.users.all')} />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { id: 'all', label: t('phoneNumbers.admin.filters.users.all'), value: 'all' },
                    { id: 'unassigned', label: t('phoneNumbers.admin.filters.users.unassigned'), value: 'unassigned' },
                    ...users
                      .filter(user => user._id && user._id !== '') // More specific filter - allow users with valid non-empty IDs
                      .map((user, index) => ({
                        id: `user-${user._id || index}`,
                        label: `${user.name || user.email} (${user.onboarding?.companyName || user.company || user.email})`,
                        value: user._id
                      }))
                  ].map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card key="total">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.admin.stats.totalNumbers')}</p>
            </CardContent>
          </Card>
          <Card key="available">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {phoneNumbers.filter(n => n.status === 'available').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.admin.stats.available')}</p>
            </CardContent>
          </Card>
          <Card key="assigned">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {phoneNumbers.filter(n => n.status === 'assigned').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.admin.stats.assigned')}</p>
            </CardContent>
          </Card>
          <Card key="reserved">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {phoneNumbers.filter(n => n.status === 'reserved').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.admin.stats.reserved')}</p>
            </CardContent>
          </Card>
          <Card key="inactive">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {phoneNumbers.filter(n => n.status === 'suspended' || n.status === 'cancelled').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.admin.stats.inactive')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Phone Numbers Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('phoneNumbers.admin.table.title', { count: total.toString() })}</CardTitle>
              <div className="flex space-x-2">
                {selectedNumbers.size > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4 mr-2" />
                        Bulk Actions ({selectedNumbers.size})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onClick={() => setShowBulkAssignModal(true)}
                        disabled={phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length === 0}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t('phoneNumbers.admin.table.bulkActions.bulkAssign', { count: phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length.toString() })}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowBulkUnassignModal(true)}
                        disabled={phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length === 0}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        {t('phoneNumbers.admin.table.bulkActions.bulkUnassign', { count: phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length.toString() })}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleBulkReputationCheck}
                        disabled={bulkReputationProgress.isRunning}
                      >
                        {bulkReputationProgress.isRunning ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Shield className="h-4 w-4 mr-2" />
                        )}
                        Bulk Reputation Check ({selectedNumbers.size})
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleBulkDelete}
                        disabled={phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'assigned').length === 0 || isSubmitting}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('phoneNumbers.admin.table.bulkActions.bulkDelete', { count: phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'assigned').length.toString() })}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedNumbers(new Set());
                          setIsSelectAllChecked(false);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {t('phoneNumbers.admin.actions.clearSelection')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* Items per page selector */}
                <Select value={filters.limit?.toString() || '10'} onValueChange={(value) => updateFilters({ limit: parseInt(value) })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                    <SelectItem value="250">250 per page</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  key="export" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportPhoneNumbers}
                  disabled={isSubmitting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isSubmitting ? t('phoneNumbers.admin.actions.exporting') : t('phoneNumbers.admin.actions.export')}
                </Button>
                <Button key="import" variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('phoneNumbers.admin.actions.import')}
                </Button>
              </div>
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
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isSelectAllChecked}
                          onCheckedChange={handleSelectAll}
                          aria-label={t('phoneNumbers.admin.table.headers.selectAll')}
                        />
                      </TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.number')}</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.country')}</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.type')}</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.status')}</TableHead>
                      <TableHead>Reputation</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.assignedTo')}</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phoneNumbers.map((number) => (
                      <TableRow key={number._id}>
                        <TableCell className="w-12">
                          <Checkbox
                            checked={selectedNumbers.has(number._id)}
                            onCheckedChange={(checked) => handleSelectNumber(number._id, !!checked)}
                            aria-label={t('phoneNumbers.admin.table.content.selectNumber', { number: number.number })}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{number.number}</TableCell>
                        <TableCell>{number.country}</TableCell>
                        <TableCell>{number.numberType}</TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(number.status)} className="flex items-center space-x-1 w-fit">
                            <span key="icon">{getStatusIcon(number.status)}</span>
                            <span key="text">{number.status}</span>
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
                                  className={`text-xs px-2 py-1 cursor-pointer transition-colors ${getReputationBadgeClasses(reputation.status)}`}
                                  onClick={() => handleCheckReputation(number)}
                                  title="Click to view detailed reputation report"
                                >
                                  <div className="flex items-center space-x-1">
                                    {getReputationIcon(reputation.status)}
                                    <span className="capitalize">{reputation.status}</span>
                                  </div>
                                </Badge>
                              );
                            }
                            
                            // No data available
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => performReputationAnalysis(number)}
                                className="text-xs px-2 py-1 h-auto text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Click to analyze reputation"
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                Analyze
                              </Button>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const reputation = phoneNumberReputations[number.number];
                            
                            if (reputation?.isLoading) {
                              return <span className="text-xs text-gray-500">-</span>;
                            }
                            
                            if (reputation?.hasData) {
                              const dangerLevel = reputation.dangerLevel;
                              return (
                                <div className="flex items-center space-x-2">
                                  <div className="flex-1 max-w-16">
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                          dangerLevel >= 70 ? 'bg-red-500' :
                                          dangerLevel >= 40 ? 'bg-orange-500' :
                                          dangerLevel >= 10 ? 'bg-blue-500' : 
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.max(dangerLevel, 5)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <span className={`text-xs font-medium ${
                                    dangerLevel >= 70 ? 'text-red-600 dark:text-red-400' :
                                    dangerLevel >= 40 ? 'text-orange-600 dark:text-orange-400' :
                                    dangerLevel >= 10 ? 'text-blue-600 dark:text-blue-400' : 
                                    'text-green-600 dark:text-green-400'
                                  }`}>
                                    {dangerLevel}%
                                  </span>
                                </div>
                              );
                            }
                            
                            return <span className="text-xs text-gray-500">-</span>;
                          })()}
                        </TableCell>
                        <TableCell>
                          {number.assignedToUser ? (
                            <div>
                              <p className="font-medium">{number.assignedToUser.name || number.assignedToUser.email}</p>
                              <p className="text-xs text-muted-foreground">{number.assignedToUser.onboarding?.companyName || number.assignedToUser.company || t('phoneNumbers.admin.table.content.noCompany')}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">{t('phoneNumbers.admin.table.content.unassigned')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {/* Primary Actions - Always Visible */}
                            <Button
                              key={`view-${number._id}`}
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                setSelectedNumber(number);
                                await fetchPhoneNumberDetails(number._id);
                                setShowDetailsModal(true);
                              }}
                              title={t('phoneNumbers.admin.table.actionButtons.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              key={`edit-${number._id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedNumber(number);
                                // Populate edit form with current phone number data
                                setEditForm({
                                  number: number.number,
                                  country: number.country,
                                  countryCode: number.countryCode,
                                  numberType: number.numberType,
                                  provider: number.provider || '',
                                  // rateDeckId removed - rate decks are assigned to users, not phone numbers
                                  currency: number.currency || 'USD',
                                  backorderOnly: number.backorderOnly || false,
                                  billingCycle: number.billingCycle || 'monthly',
                                  billingDayOfMonth: number.billingDayOfMonth || 1,
                                  capabilities: number.capabilities || ['voice'],
                                  // Technical connection parameters
                                  connectionType: number.connectionType,
                                  ipAddress: number.ipAddress || '',
                                  port: number.port,
                                  login: number.login || '',
                                  password: number.password || '',
                                  domain: number.domain || '',
                                  credentialsPort: number.credentialsPort
                                });
                                setShowEditModal(true);
                              }}
                              title={t('phoneNumbers.admin.table.actionButtons.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {/* Assign Button - Always visible, disabled when not available */}
                            <Button
                              key={`assign-${number._id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedNumber(number);
                                setShowAssignModal(true);
                              }}
                              disabled={number.status !== 'available'}
                              title={number.status === 'available' ? t('phoneNumbers.admin.table.actionButtons.assign') : `Cannot assign (${number.status})`}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>

                            {/* Unassign Button - Always visible, disabled when not assigned */}
                            <Button
                              key={`unassign-${number._id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedNumber(number);
                                setShowUnassignModal(true);
                              }}
                              disabled={number.status !== 'assigned'}
                              title={number.status === 'assigned' ? t('phoneNumbers.admin.table.actionButtons.unassign') : `Cannot unassign (${number.status})`}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                            
                            {/* More Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" title={t('phoneNumbers.admin.table.actionButtons.more')}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {/* Reserve Action - Only for available numbers */}
                                {number.status === 'available' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedNumber(number);
                                      setShowReserveModal(true);
                                    }}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    {t('phoneNumbers.admin.table.actionButtons.reserve')}
                                  </DropdownMenuItem>
                                )}

                                {/* Suspend Action - For available, assigned, or reserved numbers */}
                                {['available', 'assigned', 'reserved'].includes(number.status) && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedNumber(number);
                                      setShowSuspendModal(true);
                                    }}
                                  >
                                    <Pause className="h-4 w-4 mr-2" />
                                    {t('phoneNumbers.admin.table.actionButtons.suspend')}
                                  </DropdownMenuItem>
                                )}

                                {/* Unreserve Action - Only for reserved numbers */}
                                {number.status === 'reserved' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedNumber(number);
                                      setShowUnreserveModal(true);
                                    }}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    {t('phoneNumbers.admin.table.actionButtons.unreserve')}
                                  </DropdownMenuItem>
                                )}

                                {/* Reputation Actions */}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => performReputationAnalysis(number)}
                                  disabled={phoneNumberReputations[number.number]?.isLoading}
                                  className="text-blue-600 focus:text-blue-600"
                                >
                                  {phoneNumberReputations[number.number]?.isLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Shield className="h-4 w-4 mr-2" />
                                  )}
                                  Check Reputation
                                </DropdownMenuItem>
                                
                                {(() => {
                                  const reputation = phoneNumberReputations[number.number];
                                  if (reputation?.hasData) {
                                    return (
                                      <DropdownMenuItem
                                        onClick={() => handleCheckReputation(number)}
                                        className="text-green-600 focus:text-green-600"
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Reputation
                                      </DropdownMenuItem>
                                    );
                                  }
                                  return null;
                                })()}

                                {/* Separator before destructive actions */}
                                {number.status !== 'cancelled' && (
                                  <DropdownMenuSeparator />
                                )}

                                {/* Cancel Action - For any status except already cancelled */}
                                {number.status !== 'cancelled' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedNumber(number);
                                      setShowCancelModal(true);
                                    }}
                                    className="text-orange-600 focus:text-orange-600"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    {t('phoneNumbers.admin.table.actionButtons.cancel')}
                                  </DropdownMenuItem>
                                )}

                                {/* Delete Action - Only for non-assigned numbers */}
                                {number.status !== 'assigned' && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeletePhoneNumber(number._id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('phoneNumbers.admin.table.actionButtons.delete')}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Enhanced Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>
                        Showing {((currentPage - 1) * filters.limit!) + 1} to {Math.min(currentPage * filters.limit!, total)} of {total} numbers
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* First page button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Previous page button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(currentPage - 1)}
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
                                onClick={() => changePage(i)}
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
                        onClick={() => changePage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Last page button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Phone Number Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.create.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.create.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="number">{t('phoneNumbers.admin.modals.create.fields.number')} *</Label>
                  <Input
                    id="number"
                    value={createForm.number}
                    onChange={(e) => setCreateForm({ ...createForm, number: e.target.value })}
                    placeholder={t('phoneNumbers.admin.modals.create.fields.numberPlaceholder')}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="country">{t('phoneNumbers.admin.modals.create.fields.country')} *</Label>
                  <Select 
                    value={createForm.country} 
                    onValueChange={(countryName) => {
                      const selectedCountry = countries.find(c => c.name === countryName);
                      setCreateForm({ 
                        ...createForm, 
                        country: countryName,
                        countryCode: selectedCountry?.code || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('phoneNumbers.admin.modals.create.fields.country')} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries
                        .filter(country => country._id) // Filter out countries with undefined/null IDs
                        .map((country, index) => (
                          <SelectItem key={`create-country-${country._id || index}`} value={country.name}>
                            {country.name} (+{country.phoneCode})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="numberType">{t('phoneNumbers.admin.modals.create.fields.numberType')} *</Label>
                  <Select value={createForm.numberType} onValueChange={(value: PhoneNumberType) => setCreateForm({ ...createForm, numberType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { id: 'geographic', label: t('phoneNumbers.admin.filters.types.geographic'), value: 'Geographic/Local' },
                        { id: 'mobile', label: t('phoneNumbers.admin.filters.types.mobile'), value: 'Mobile' },
                        { id: 'national', label: t('phoneNumbers.admin.filters.types.national'), value: 'National' },
                        { id: 'tollfree', label: t('phoneNumbers.admin.filters.types.tollfree'), value: 'Toll-free' },
                        { id: 'shared', label: t('phoneNumbers.admin.filters.types.shared'), value: 'Shared Cost' },
                        { id: 'npv', label: t('phoneNumbers.admin.filters.types.npv'), value: 'NPV (Verified Numbers)' },
                        { id: 'premium', label: t('phoneNumbers.admin.filters.types.premium'), value: 'Premium' }
                      ].map(option => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="provider">{t('phoneNumbers.admin.modals.create.fields.provider')} *</Label>
                  <Select 
                    value={createForm.provider} 
                    onValueChange={(value) => setCreateForm({ ...createForm, provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('phoneNumbers.admin.modals.create.fields.provider')} />
                    </SelectTrigger>
                    <SelectContent>
                      {providers
                        .filter(provider => provider._id) // Filter out providers with undefined/null IDs
                        .map((provider, index) => (
                          <SelectItem key={`create-provider-${provider._id || index}`} value={provider.name}>
                            <div>
                              <div>{provider.name}</div>
                              {provider.description && (
                                <div className="text-xs text-muted-foreground">{provider.description}</div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate deck selection removed - rate decks are now assigned to users, not phone numbers */}
              </div>
              
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={createForm.backorderOnly || false}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, backorderOnly: !!checked })}
                  />
                  <Label htmlFor="backorderOnly" className="text-sm font-medium">
                    {t('phoneNumbers.admin.modals.create.fields.backorderOnly')}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('phoneNumbers.admin.modals.create.fields.backorderDescription')}
                </p>
              </div>
              
              {/* Technical Connection Parameters */}
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium text-muted-foreground">{t('phoneNumbers.admin.modals.create.tabs.technical')}</Label>
                </div>
                <div className="mt-2 space-y-3">
                  <div>
                    <Label htmlFor="connectionType">{t('phoneNumbers.admin.modals.create.fields.connectionType')}</Label>
                    <Select 
                      value={createForm.connectionType || 'none'} 
                      onValueChange={(value: ConnectionType | 'none') => setCreateForm({ ...createForm, connectionType: value === 'none' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('phoneNumbers.admin.modals.create.fields.connectionType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ip_routing">IP Routing</SelectItem>
                        <SelectItem value="credentials">Credentials</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {createForm.connectionType === 'ip_routing' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ipAddress">{t('phoneNumbers.admin.modals.create.fields.ipAddress')}</Label>
                        <Input
                          id="ipAddress"
                          value={createForm.ipAddress}
                          onChange={(e) => setCreateForm({ ...createForm, ipAddress: e.target.value })}
                          placeholder="192.168.1.1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="port">{t('phoneNumbers.admin.modals.create.fields.port')}</Label>
                        <Input
                          id="port"
                          type="number"
                          value={createForm.port || ''}
                          onChange={(e) => setCreateForm({ ...createForm, port: parseInt(e.target.value) || undefined })}
                          placeholder="5060"
                        />
                      </div>
                    </div>
                  )}
                  
                  {createForm.connectionType === 'credentials' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="login">{t('phoneNumbers.admin.modals.create.fields.login')}</Label>
                        <Input
                          id="login"
                          value={createForm.login}
                          onChange={(e) => setCreateForm({ ...createForm, login: e.target.value })}
                          placeholder="username"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">{t('phoneNumbers.admin.modals.create.fields.password')}</Label>
                        <Input
                          id="password"
                          type="password"
                          value={createForm.password}
                          onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                          placeholder="password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="domain">{t('phoneNumbers.admin.modals.create.fields.domain')}</Label>
                        <Input
                          id="domain"
                          value={createForm.domain}
                          onChange={(e) => setCreateForm({ ...createForm, domain: e.target.value })}
                          placeholder="sip.example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="credentialsPort">{t('phoneNumbers.admin.modals.create.fields.credentialsPort')}</Label>
                        <Input
                          id="credentialsPort"
                          type="number"
                          value={createForm.credentialsPort || ''}
                          onChange={(e) => setCreateForm({ ...createForm, credentialsPort: parseInt(e.target.value) || undefined })}
                          placeholder="5060"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Optional description for this phone number"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                {t('phoneNumbers.admin.modals.create.buttons.cancel')}
              </Button>
              <Button
                onClick={handleCreatePhoneNumber}
                disabled={isSubmitting || !createForm.number || !createForm.country || !createForm.provider}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.create.buttons.creating')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.create.buttons.create')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Phone Number Modal */}
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.assign.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.assign.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="userId">{t('phoneNumbers.admin.modals.assign.fields.user')} *</Label>
                <Select value={assignForm.userId} onValueChange={(value) => setAssignForm({ ...assignForm, userId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('phoneNumbers.admin.modals.assign.fields.user')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      if (users.length === 0) {
                        return [
                          <SelectItem key="no-users" value="no-users" disabled>
                            No users available
                          </SelectItem>
                        ];
                      }
                      
                      return users.map((user, index) => {
                        const userId = user._id || `fallback-${index}`;
                        const userEmail = user.email || 'No email';
                        const userName = user.name || userEmail;
                        const companyName = user.onboarding?.companyName || user.company || userEmail;
                        
                        return (
                          <SelectItem key={`assign-user-${userId}`} value={userId}>
                            {userName} ({companyName})
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="billingStartDate">{t('phoneNumbers.admin.modals.assign.fields.billingStartDate')}</Label>
                <Input
                  id="billingStartDate"
                  type="date"
                  value={assignForm.billingStartDate}
                  onChange={(e) => setAssignForm({ ...assignForm, billingStartDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="notes">{t('phoneNumbers.admin.modals.assign.fields.notes')}</Label>
                <Textarea
                  id="notes"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.assign.fields.notes')}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                {t('phoneNumbers.admin.modals.assign.buttons.cancel')}
              </Button>
              <Button
                onClick={handleAssignPhoneNumber}
                disabled={isSubmitting || !assignForm.userId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.assign.buttons.assigning')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.assign.buttons.assign')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Unassign Phone Number Modal */}
        <Dialog open={showUnassignModal} onOpenChange={setShowUnassignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.unassign.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.unassign.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">{t('phoneNumbers.admin.modals.unassign.fields.reason')}</Label>
                <Textarea
                  id="reason"
                  value={unassignForm.reason}
                  onChange={(e) => setUnassignForm({ ...unassignForm, reason: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.unassign.fields.reason')}
                  rows={3}
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={unassignForm.cancelPendingBilling}
                    onCheckedChange={(checked) => setUnassignForm({ ...unassignForm, cancelPendingBilling: !!checked })}
                  />
                  <Label htmlFor="bulkCancelPendingBilling" className="text-sm font-medium">
                    {t('phoneNumbers.admin.modals.unassign.fields.cancelPendingBilling')}
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={unassignForm.createRefund}
                    onCheckedChange={(checked) => setUnassignForm({ ...unassignForm, createRefund: !!checked })}
                  />
                  <Label htmlFor="bulkCreateRefund" className="text-sm font-medium">
                    {t('phoneNumbers.admin.modals.unassign.fields.createRefund')}
                  </Label>
                </div>
                
                {unassignForm.createRefund && (
                  <div>
                    <Label htmlFor="bulkRefundAmount">{t('phoneNumbers.admin.modals.unassign.fields.refundAmount')}</Label>
                    <Input
                      id="bulkRefundAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={unassignForm.refundAmount}
                      onChange={(e) => setUnassignForm({ ...unassignForm, refundAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This amount will be refunded for each unassigned number
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowUnassignModal(false)}>
                {t('phoneNumbers.admin.modals.unassign.buttons.cancel')}
              </Button>
              <Button
                onClick={handleUnassignPhoneNumber}
                disabled={isSubmitting}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.unassign.buttons.unassigning')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.unassign.buttons.unassign')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Phone Number Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className=" sm:max-w-1lg max-w-[50vw] max-h-[95vh] overflow-hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold">{t('phoneNumbers.admin.modals.details.title')}</DialogTitle>
                  <DialogDescription className="text-base mt-1">
                    Complete information and history for {selectedNumber?.number}
                  </DialogDescription>
                </div>
                {selectedNumberDetails && (
                  <div className="flex items-center space-x-3">
                    <Badge variant={getBadgeVariant(selectedNumberDetails.status)} className="flex items-center space-x-2 px-3 py-1 text-sm">
                      {getStatusIcon(selectedNumberDetails.status)}
                      <span className="capitalize font-medium">{selectedNumberDetails.status}</span>
                    </Badge>
                    {selectedNumberDetails.backorderOnly && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Backorder Only
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>
            
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin mr-3" />
                <span className="text-lg">{t('phoneNumbers.admin.messages.loading.details')}</span>
              </div>
            ) : selectedNumberDetails && (
              <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
                {/* Header Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Number Info Card */}
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <Hash className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('phoneNumbers.admin.modals.details.fields.number')}</p>
                          <p className="text-xl font-bold font-mono text-blue-900 dark:text-blue-100">{selectedNumberDetails.number}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Location Card */}
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">Location</p>
                          <p className="text-lg font-bold text-green-900 dark:text-green-100">{selectedNumberDetails.country}</p>
                          <p className="text-sm text-green-600 dark:text-green-400">+{selectedNumberDetails.countryCode} • {selectedNumberDetails.numberType}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Billing Rate Card - Only show for assigned numbers */}
                  {selectedNumberDetails.assignedToUser && selectedNumberDetails.currentBilling && (
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-500 rounded-lg">
                            <Hash className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Billing Rate</p>
                            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                              {formatCurrency(selectedNumberDetails.currentBilling.monthlyRate, selectedNumberDetails.currentBilling.currency || 'USD')}/month
                            </p>
                            {selectedNumberDetails.currentBilling.setupFee && selectedNumberDetails.currentBilling.setupFee > 0 && (
                              <p className="text-xs text-purple-600 dark:text-purple-400">
                                Setup: {formatCurrency(selectedNumberDetails.currentBilling.setupFee, selectedNumberDetails.currentBilling.currency || 'USD')}
                              </p>
                            )}
                            <p className="text-sm text-purple-600 dark:text-purple-400">
                              From user's assigned rate deck
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Current Assignment Alert */}
                {selectedNumberDetails.assignedToUser && (
                  <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Currently assigned to:</span> {selectedNumberDetails.assignedToUser.name || selectedNumberDetails.assignedToUser.email}
                          <span className="ml-2 text-sm">({selectedNumberDetails.assignedToUser.onboarding?.companyName || selectedNumberDetails.assignedToUser.company || 'No company'})</span>
                          {selectedNumberDetails.assignedAt && (
                            <div className="text-sm mt-1">
                              Assigned: {formatDate(selectedNumberDetails.assignedAt)}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowUnassignModal(true);
                            setShowDetailsModal(false);
                          }}
                          className="text-blue-600 border-blue-200 hover:bg-blue-100"
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Unassign
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Main Content Tabs */}
                <div className="space-y-6">
                  {/* Technical Details Section */}
                  <Card>
                    <CardHeader className="bg-muted/30">
                      <CardTitle className="flex items-center space-x-2">
                        <Hash className="h-5 w-5" />
                        <span>Technical Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Provider</Label>
                            <p className="text-sm font-medium">{selectedNumberDetails.provider || 'Not specified'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Currency</Label>
                            <p className="text-sm font-medium">{selectedNumberDetails.currency || 'USD'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Billing Cycle</Label>
                            <p className="text-sm font-medium capitalize">{selectedNumberDetails.billingCycle || 'monthly'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Billing Day</Label>
                            <p className="text-sm font-medium">{selectedNumberDetails.billingDayOfMonth || 1} of each month</p>
                          </div>
                          {selectedNumberDetails.currentBilling?.setupFee && selectedNumberDetails.currentBilling.setupFee > 0 && (
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Setup Fee</Label>
                              <p className="text-sm font-medium">{formatCurrency(selectedNumberDetails.currentBilling.setupFee, selectedNumberDetails.currentBilling.currency || 'USD')}</p>
                            </div>
                          )}
                          {selectedNumberDetails.nextBillingDate && (
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Next Billing</Label>
                              <p className="text-sm font-medium">{formatDate(selectedNumberDetails.nextBillingDate)}</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {selectedNumberDetails.capabilities && selectedNumberDetails.capabilities.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Capabilities</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {selectedNumberDetails.capabilities.map((capability) => (
                                  <Badge key={capability} variant="outline" className="text-xs">
                                    {capability}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                            <p className="text-sm font-medium">{formatDate(selectedNumberDetails.createdAt)}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                            <p className="text-sm font-medium">{formatDate(selectedNumberDetails.updatedAt)}</p>
                          </div>
                        </div>
                      </div>

                      {selectedNumberDetails.description && (
                        <div className="mt-6 pt-4 border-t">
                          <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                          <p className="text-sm mt-1">{selectedNumberDetails.description}</p>
                        </div>
                      )}

                      {/* Technical Connection Parameters */}
                      <div className="mt-6 pt-4 border-t">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-medium text-muted-foreground">Technical Connection Parameters</Label>
                          </div>
                          {selectedNumberDetails.connectionType && (
                            <Badge variant="outline" className="text-slate-700 border-slate-300">
                              {selectedNumberDetails.connectionType === 'ip_routing' ? 'IP Routing' : 'Credential-Based'}
                            </Badge>
                          )}
                        </div>
                        
                        {selectedNumberDetails.connectionType ? (
                          <div className="space-y-4">
                            {/* Connection Method Overview */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Connection Method</Label>
                                <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${selectedNumberDetails.connectionType === 'ip_routing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                      {selectedNumberDetails.connectionType === 'ip_routing' ? (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                                        </svg>
                                      ) : (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                        {selectedNumberDetails.connectionType === 'ip_routing' ? 'IP Address Routing' : 'Username/Password Authentication'}
                                      </p>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">
                                        {selectedNumberDetails.connectionType === 'ip_routing' 
                                          ? 'Direct routing based on source IP address' 
                                          : 'Authentication using login credentials'
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configuration Status</Label>
                                <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-100 text-green-700">
                                      <CheckCircle className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Configured</p>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">Ready for user setup</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Connection Details */}
                            <div className="bg-muted/30 rounded-lg border p-4">
                              <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Connection Parameters
                              </h5>
                              
                              {selectedNumberDetails.connectionType === 'ip_routing' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedNumberDetails.ipAddress && (
                                    <div className="group">
                                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IP Address</Label>
                                      <div className="mt-1 flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                          {selectedNumberDetails.ipAddress}
                                        </code>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleCopyToClipboard(selectedNumberDetails.ipAddress!, `ipAddress`)}
                                          className="transition-all duration-200"
                                          title="Copy to clipboard"
                                        >
                                          {copiedStates.ipAddress ? (
                                            <CheckCircle className="h-3 w-3 text-green-600" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  {selectedNumberDetails.port && (
                                    <div className="group">
                                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Port</Label>
                                      <div className="mt-1 flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                          {selectedNumberDetails.port}
                                        </code>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleCopyToClipboard(selectedNumberDetails.port!.toString(), `port`)}
                                          className="transition-all duration-200"
                                          title="Copy to clipboard"
                                        >
                                          {copiedStates.port ? (
                                            <CheckCircle className="h-3 w-3 text-green-600" />
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {selectedNumberDetails.connectionType === 'credentials' && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedNumberDetails.login && (
                                      <div className="group">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Username</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                            {selectedNumberDetails.login}
                                          </code>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyToClipboard(selectedNumberDetails.login!, `login`)}
                                            className="transition-all duration-200"
                                            title="Copy to clipboard"
                                          >
                                            {copiedStates.login ? (
                                              <CheckCircle className="h-3 w-3 text-green-600" />
                                            ) : (
                                              <Copy className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {selectedNumberDetails.password && (
                                      <div className="group">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Password</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                            ••••••••
                                          </code>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyToClipboard(selectedNumberDetails.password!, `password`)}
                                            className="transition-all duration-200"
                                            title="Copy password to clipboard"
                                          >
                                            {copiedStates.password ? (
                                              <CheckCircle className="h-3 w-3 text-green-600" />
                                            ) : (
                                              <Copy className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedNumberDetails.domain && (
                                      <div className="group">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Server/Domain</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                            {selectedNumberDetails.domain}
                                          </code>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyToClipboard(selectedNumberDetails.domain!, `domain`)}
                                            className="transition-all duration-200"
                                            title="Copy to clipboard"
                                          >
                                            {copiedStates.domain ? (
                                              <CheckCircle className="h-3 w-3 text-green-600" />
                                            ) : (
                                              <Copy className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {selectedNumberDetails.credentialsPort && (
                                      <div className="group">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Port</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                            {selectedNumberDetails.credentialsPort}
                                          </code>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyToClipboard(selectedNumberDetails.credentialsPort!.toString(), `credentialsPort`)}
                                            className="transition-all duration-200"
                                            title="Copy to clipboard"
                                          >
                                            {copiedStates.credentialsPort ? (
                                              <CheckCircle className="h-3 w-3 text-green-600" />
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

                              {/* Setup Instructions */}
                              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start gap-2">
                                  <svg className="h-4 w-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                  <div>
                                    <p className="font-medium text-blue-900 dark:text-blue-100 text-xs">User Setup Instructions</p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                      {selectedNumberDetails.connectionType === 'ip_routing' 
                                        ? `User configures PBX to route calls from ${selectedNumberDetails.ipAddress}:${selectedNumberDetails.port || '5060'} for this number.`
                                        : `User authenticates with username "${selectedNumberDetails.login}" and provided password at ${selectedNumberDetails.domain}:${selectedNumberDetails.credentialsPort || '5060'}.`
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg border border-orange-200 text-center">
                            <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mb-3">
                              <AlertCircle className="h-6 w-6 text-orange-600" />
                            </div>
                            <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                              No Connection Parameters Configured
                            </p>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mb-4">
                              This number doesn&apos;t have technical connection details. Configure IP routing or credential-based connection parameters for user setup.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditForm({
                                  ...editForm,
                                  number: selectedNumberDetails.number,
                                  country: selectedNumberDetails.country,
                                  countryCode: selectedNumberDetails.countryCode,
                                  numberType: selectedNumberDetails.numberType,
                                  provider: selectedNumberDetails.provider || '',
                                  // rateDeckId removed - rate decks are assigned to users, not phone numbers
                                  currency: selectedNumberDetails.currency || 'USD',
                                  backorderOnly: selectedNumberDetails.backorderOnly || false,
                                  billingCycle: selectedNumberDetails.billingCycle || 'monthly',
                                  billingDayOfMonth: selectedNumberDetails.billingDayOfMonth || 1,
                                  capabilities: selectedNumberDetails.capabilities || ['voice'],
                                  description: selectedNumberDetails.description || '',
                                  region: selectedNumberDetails.region || '',
                                  timeZone: selectedNumberDetails.timeZone || '',
                                  connectionType: selectedNumberDetails.connectionType,
                                  ipAddress: selectedNumberDetails.ipAddress || '',
                                  port: selectedNumberDetails.port,
                                  login: selectedNumberDetails.login || '',
                                  password: selectedNumberDetails.password || '',
                                  domain: selectedNumberDetails.domain || '',
                                  credentialsPort: selectedNumberDetails.credentialsPort,
                                  notes: selectedNumberDetails.notes || ''
                                });
                                setSelectedNumber(selectedNumberDetails);
                                setShowEditModal(true);
                                setShowDetailsModal(false);
                              }}
                              className="text-orange-700 border-orange-300 hover:bg-orange-100"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Add Connection Details
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Assignment History Section */}
                  {selectedNumberDetails.assignmentHistory && selectedNumberDetails.assignmentHistory.length > 0 && (
                    <Card>
                      <CardHeader className="bg-muted/30">
                        <CardTitle className="flex items-center space-x-2">
                          <UserPlus className="h-5 w-5" />
                          <span>Assignment History</span>
                          <Badge variant="outline" className="ml-2">
                            {selectedNumberDetails.assignmentHistory?.length || 0} assignment{(selectedNumberDetails.assignmentHistory?.length || 0) !== 1 ? 's' : ''}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {selectedNumberDetails.assignmentHistory?.map((assignment, index) => (
                            <div key={assignment._id} className="relative">
                              {/* Timeline connector */}
                              {index < (selectedNumberDetails.assignmentHistory?.length || 0) - 1 && (
                                <div className="absolute left-4 top-12 w-0.5 h-full bg-muted-foreground/20"></div>
                              )}
                              
                              <div className="flex space-x-4">
                                <div className="flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    assignment.status === 'active' && selectedNumberDetails.status === 'assigned' 
                                      ? 'bg-green-500' 
                                      : 'bg-muted-foreground/20'
                                  }`}>
                                    <UserPlus className={`h-4 w-4 ${
                                      assignment.status === 'active' && selectedNumberDetails.status === 'assigned' 
                                        ? 'text-white' 
                                        : 'text-muted-foreground'
                                    }`} />
                                  </div>
                                </div>
                                
                                <Card className="flex-1">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-2">
                                        <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                                          {assignment.status}
                                        </Badge>
                                        {assignment.status === 'active' && selectedNumberDetails.status === 'assigned' && (
                                          <Badge variant="outline" className="text-green-600 border-green-200">
                                            Current
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        Duration: {assignment.unassignedAt 
                                          ? Math.ceil((new Date(assignment.unassignedAt).getTime() - new Date(assignment.assignedAt).getTime()) / (1000 * 60 * 60 * 24))
                                          : Math.ceil((new Date().getTime() - new Date(assignment.assignedAt).getTime()) / (1000 * 60 * 60 * 24))
                                        } days
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">User</Label>
                                        <p className="font-medium">{assignment.user?.name || assignment.user?.email || 'Unknown User'}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {assignment.user?.onboarding?.companyName || assignment.user?.company || 'No company'}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Assigned Date</Label>
                                        <p className="font-medium">{formatDate(assignment.assignedAt)}</p>
                                        {assignment.assignedBy && (
                                          <p className="text-xs text-muted-foreground">by {assignment.assignedBy}</p>
                                        )}
                                      </div>
                                      {assignment.unassignedAt && (
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground">Unassigned Date</Label>
                                          <p className="font-medium">{formatDate(assignment.unassignedAt)}</p>
                                        </div>
                                      )}
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Monthly Rate</Label>
                                        <p className="font-medium">{formatCurrency(assignment.monthlyRate, assignment.currency)}</p>
                                      </div>
                                      {assignment.setupFee > 0 && (
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground">Setup Fee</Label>
                                          <p className="font-medium">{formatCurrency(assignment.setupFee, assignment.currency)}</p>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {assignment.unassignedReason && (
                                      <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950 rounded border-l-4 border-orange-200">
                                        <Label className="text-xs font-medium text-orange-700 dark:text-orange-300">Unassignment Reason</Label>
                                        <p className="text-sm text-orange-800 dark:text-orange-200">{assignment.unassignedReason}</p>
                                      </div>
                                    )}
                                    
                                    {assignment.notes && (
                                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 rounded border-l-4 border-blue-200">
                                        <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">Notes</Label>
                                        <p className="text-sm text-blue-800 dark:text-blue-200">{assignment.notes}</p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Enhanced Audit Trail Section */}
                  {selectedNumberDetails.notes && (() => {
                    const auditEntries = parseAuditTrail(selectedNumberDetails.notes);
                    return (
                      <Card>
                        <CardHeader className="bg-muted/30">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center space-x-2">
                              <AlertCircle className="h-5 w-5" />
                              <span>Action History & Audit Trail</span>
                              <Badge variant="outline" className="ml-2">
                                {auditEntries.length} action{auditEntries.length !== 1 ? 's' : ''}
                              </Badge>
                            </CardTitle>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Latest first • UTC timestamps</span>
                            </div>
                          </div>
                          <DialogDescription>
                            Chronological timeline of all administrative actions with detailed context
                          </DialogDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                          {auditEntries.length > 0 ? (
                            <div className="space-y-4">
                              {auditEntries.map((entry, index) => (
                                <div key={entry.id} className="relative">
                                  {/* Timeline connector */}
                                  {index < auditEntries.length - 1 && (
                                    <div className="absolute left-6 top-14 w-0.5 h-full bg-gradient-to-b from-muted-foreground/30 to-transparent"></div>
                                  )}
                                  
                                  <div className="flex space-x-4">
                                    {/* Action Icon */}
                                    <div className="flex-shrink-0">
                                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                                        entry.actionColor === 'blue' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950' :
                                        entry.actionColor === 'green' ? 'bg-green-50 border-green-200 dark:bg-green-950' :
                                        entry.actionColor === 'orange' ? 'bg-orange-50 border-orange-200 dark:bg-orange-950' :
                                        entry.actionColor === 'red' ? 'bg-red-50 border-red-200 dark:bg-red-950' :
                                        'bg-gray-50 border-gray-200 dark:bg-gray-950'
                                      }`}>
                                        <span className={
                                          entry.actionColor === 'blue' ? 'text-blue-600' :
                                          entry.actionColor === 'green' ? 'text-green-600' :
                                          entry.actionColor === 'orange' ? 'text-orange-600' :
                                          entry.actionColor === 'red' ? 'text-red-600' :
                                          'text-gray-600'
                                        }>
                                          {entry.actionIcon}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Action Content */}
                                    <Card className="flex-1 shadow-sm hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        {/* Action Header */}
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-3">
                                            <Badge 
                                              variant={entry.actionColor === 'red' ? 'destructive' : 'secondary'}
                                              className={
                                                entry.actionColor === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                entry.actionColor === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                                                entry.actionColor === 'orange' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                ''
                                              }
                                            >
                                              {entry.actionType}
                                            </Badge>
                                            <span className="text-sm font-medium text-muted-foreground">
                                              by {entry.user}
                                            </span>
                                          </div>
                                          {entry.timestamp && (
                                            <div className="text-xs text-muted-foreground">
                                              {formatDate(entry.timestamp)}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Action Details */}
                                        {entry.reason && (
                                          <div className="mb-3">
                                            <Label className="text-xs font-medium text-muted-foreground">Reason</Label>
                                            <p className="text-sm mt-1 bg-muted/30 rounded p-2">{entry.reason}</p>
                                          </div>
                                        )}
                                        
                                        {entry.details.length > 0 && (
                                          <div className="mb-3">
                                            <Label className="text-xs font-medium text-muted-foreground">Additional Details</Label>
                                            <div className="text-sm mt-1 space-y-1">
                                              {entry.details.map((detail, idx) => (
                                                <div key={idx} className="text-muted-foreground bg-muted/20 rounded px-2 py-1">
                                                  {detail}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {entry.notes && (
                                          <div>
                                            <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                                            <p className="text-sm mt-1 bg-blue-50 dark:bg-blue-950 rounded p-2 border-l-4 border-blue-200">
                                              {entry.notes}
                                            </p>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Raw Audit Log Toggle */}
                              <div className="pt-4 border-t">
                                <details className="group">
                                  <summary className="flex items-center space-x-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                    <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                    <span>View Raw Audit Log</span>
                                  </summary>
                                  <div className="mt-3 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border">
                                    <pre className="text-xs whitespace-pre-wrap font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-60 overflow-y-auto">
                                      {selectedNumberDetails.notes}
                                    </pre>
                                  </div>
                                </details>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No audit trail available</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              </div>
            )}
            
            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last updated: {selectedNumberDetails ? formatDate(selectedNumberDetails.updatedAt) : ''}</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedNumber) {
                      setEditForm({
                        number: selectedNumber.number,
                        country: selectedNumber.country,
                        countryCode: selectedNumber.countryCode,
                        numberType: selectedNumber.numberType,
                        provider: selectedNumber.provider || '',
                        // rateDeckId removed - rate decks are assigned to users, not phone numbers
                        currency: selectedNumber.currency || 'USD',
                        backorderOnly: selectedNumber.backorderOnly || false,
                        billingCycle: selectedNumber.billingCycle || 'monthly',
                        billingDayOfMonth: selectedNumber.billingDayOfMonth || 1,
                        capabilities: selectedNumber.capabilities || ['voice'],
                        // Technical connection parameters
                        connectionType: selectedNumber.connectionType,
                        ipAddress: selectedNumber.ipAddress || '',
                        port: selectedNumber.port,
                        login: selectedNumber.login || '',
                        password: selectedNumber.password || '',
                        domain: selectedNumber.domain || '',
                        credentialsPort: selectedNumber.credentialsPort
                      });
                      setShowEditModal(true);
                      setShowDetailsModal(false);
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {t('phoneNumbers.admin.table.actionButtons.edit')}
                </Button>
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  {t('phoneNumbers.admin.modals.details.buttons.close')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Phone Number Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.edit.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.edit.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="editNumber">{t('phoneNumbers.admin.modals.edit.fields.number')} *</Label>
                  <Input
                    id="editNumber"
                    value={editForm.number}
                    onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                    placeholder={t('phoneNumbers.admin.modals.edit.fields.numberPlaceholder')}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="editCountry">{t('phoneNumbers.admin.modals.edit.fields.country')} *</Label>
                  <Select 
                    value={editForm.country} 
                    onValueChange={(countryName) => {
                      const selectedCountry = countries.find(c => c.name === countryName);
                      setEditForm({ 
                        ...editForm, 
                        country: countryName,
                        countryCode: selectedCountry?.code || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('phoneNumbers.admin.modals.edit.fields.countryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries
                        .filter(country => country._id)
                        .map((country, index) => (
                          <SelectItem key={`edit-country-${country._id || index}`} value={country.name}>
                            {country.name} (+{country.phoneCode})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editNumberType">{t('phoneNumbers.admin.modals.edit.fields.numberType')} *</Label>
                  <Select value={editForm.numberType} onValueChange={(value: PhoneNumberType) => setEditForm({ ...editForm, numberType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { id: 'geographic', label: t('phoneNumbers.admin.modals.edit.numberTypes.geographic'), value: 'Geographic/Local' },
                        { id: 'mobile', label: t('phoneNumbers.admin.modals.edit.numberTypes.mobile'), value: 'Mobile' },
                        { id: 'national', label: t('phoneNumbers.admin.modals.edit.numberTypes.national'), value: 'National' },
                        { id: 'tollfree', label: t('phoneNumbers.admin.modals.edit.numberTypes.tollfree'), value: 'Toll-free' },
                        { id: 'shared', label: t('phoneNumbers.admin.modals.edit.numberTypes.shared'), value: 'Shared Cost' },
                        { id: 'npv', label: t('phoneNumbers.admin.modals.edit.numberTypes.npv'), value: 'NPV (Verified Numbers)' },
                        { id: 'premium', label: t('phoneNumbers.admin.modals.edit.numberTypes.premium'), value: 'Premium' }
                      ].map(option => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editProvider">{t('phoneNumbers.admin.modals.edit.fields.provider')}</Label>
                  <Select value={editForm.provider} onValueChange={(value) => setEditForm({ ...editForm, provider: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('phoneNumbers.admin.modals.edit.fields.providerPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {providers
                        .filter(provider => provider._id)
                        .map((provider, index) => (
                          <SelectItem key={`edit-provider-${provider._id || index}`} value={provider.name}>
                            {provider.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate deck selection removed - rate decks are now assigned to users, not phone numbers */}

                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={editForm.backorderOnly || false}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, backorderOnly: !!checked })}
                    />
                    <Label htmlFor="editBackorderOnly" className="text-sm font-medium">
                      {t('phoneNumbers.admin.modals.edit.fields.backorderOnly')}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('phoneNumbers.admin.modals.edit.fields.backorderDescription')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="editBillingCycle">{t('phoneNumbers.admin.modals.edit.fields.billingCycle')}</Label>
                  <Select value={editForm.billingCycle} onValueChange={(value: BillingCycle) => setEditForm({ ...editForm, billingCycle: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t('phoneNumbers.admin.modals.edit.billingCycles.monthly')}</SelectItem>
                      <SelectItem value="yearly">{t('phoneNumbers.admin.modals.edit.billingCycles.yearly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editBillingDay">{t('phoneNumbers.admin.modals.edit.fields.billingDay')}</Label>
                  <Input
                    id="editBillingDay"
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.billingDayOfMonth}
                    onChange={(e) => setEditForm({ ...editForm, billingDayOfMonth: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>{t('phoneNumbers.admin.modals.edit.fields.capabilities')}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(['voice', 'sms', 'fax', 'data'] as PhoneNumberCapability[]).map((capability) => (
                      <div key={capability} className="flex items-center space-x-2">
                        <Checkbox
                          checked={editForm.capabilities.includes(capability)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditForm({ ...editForm, capabilities: [...editForm.capabilities, capability] });
                            } else {
                              setEditForm({ ...editForm, capabilities: editForm.capabilities.filter(c => c !== capability) });
                            }
                          }}
                        />
                        <Label htmlFor={`edit-capability-${capability}`} className="text-sm capitalize">
                          {t(`phoneNumbers.admin.modals.edit.capabilities.${capability}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Connection Parameters */}
                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium text-muted-foreground">{t('phoneNumbers.admin.modals.edit.sections.technical')}</Label>
                  </div>
                  <div className="mt-2 space-y-3">
                    <div>
                      <Label htmlFor="editConnectionType">{t('phoneNumbers.admin.modals.edit.fields.connectionType')}</Label>
                      <Select 
                        value={editForm.connectionType || 'none'} 
                        onValueChange={(value: ConnectionType | 'none') => setEditForm({ ...editForm, connectionType: value === 'none' ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('phoneNumbers.admin.modals.edit.fields.connectionTypePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('phoneNumbers.admin.modals.edit.connectionTypes.none')}</SelectItem>
                          <SelectItem value="ip_routing">{t('phoneNumbers.admin.modals.edit.connectionTypes.ip_routing')}</SelectItem>
                          <SelectItem value="credentials">{t('phoneNumbers.admin.modals.edit.connectionTypes.credentials')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {editForm.connectionType === 'ip_routing' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editIpAddress">{t('phoneNumbers.admin.modals.edit.fields.ipAddress')}</Label>
                          <Input
                            id="editIpAddress"
                            value={editForm.ipAddress}
                            onChange={(e) => setEditForm({ ...editForm, ipAddress: e.target.value })}
                            placeholder="192.168.1.1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editPort">{t('phoneNumbers.admin.modals.edit.fields.port')}</Label>
                          <Input
                            id="editPort"
                            type="number"
                            value={editForm.port || ''}
                            onChange={(e) => setEditForm({ ...editForm, port: parseInt(e.target.value) || undefined })}
                            placeholder="5060"
                          />
                        </div>
                      </div>
                    )}
                    
                    {editForm.connectionType === 'credentials' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editLogin">{t('phoneNumbers.admin.modals.edit.fields.login')}</Label>
                          <Input
                            id="editLogin"
                            value={editForm.login}
                            onChange={(e) => setEditForm({ ...editForm, login: e.target.value })}
                            placeholder="username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editPassword">{t('phoneNumbers.admin.modals.edit.fields.password')}</Label>
                          <Input
                            id="editPassword"
                            type="password"
                            value={editForm.password}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            placeholder="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editDomain">{t('phoneNumbers.admin.modals.edit.fields.domain')}</Label>
                          <Input
                            id="editDomain"
                            value={editForm.domain}
                            onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                            placeholder="sip.example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editCredentialsPort">{t('phoneNumbers.admin.modals.edit.fields.credentialsPort')}</Label>
                          <Input
                            id="editCredentialsPort"
                            type="number"
                            value={editForm.credentialsPort || ''}
                            onChange={(e) => setEditForm({ ...editForm, credentialsPort: parseInt(e.target.value) || undefined })}
                            placeholder="5060"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                {t('phoneNumbers.admin.modals.edit.buttons.cancel')}
              </Button>
              <Button
                onClick={handleEditPhoneNumber}
                disabled={isSubmitting || !editForm.number || !editForm.country}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.edit.buttons.updating')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.edit.buttons.update')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Assign Phone Numbers Modal */}
        <Dialog open={showBulkAssignModal} onOpenChange={setShowBulkAssignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Assign Phone Numbers</DialogTitle>
              <DialogDescription>
                Assign {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length} available phone numbers to a user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Show selected numbers summary */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <Label className="text-sm font-medium">Selected Numbers Summary</Label>
                <div className="mt-2 text-sm space-y-1">
                  <div>Total Selected: {selectedNumbers.size}</div>
                  <div className="text-green-600">
                    Available for Assignment: {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length}
                  </div>
                  {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'available').length > 0 && (
                    <div className="text-yellow-600">
                      Not Available: {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'available').length} (will be skipped)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="bulkUserId">User *</Label>
                <Select value={assignForm.userId} onValueChange={(value) => setAssignForm({ ...assignForm, userId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      if (users.length === 0) {
                        return [
                          <SelectItem key="no-users" value="no-users" disabled>
                            No users available
                          </SelectItem>
                        ];
                      }
                      
                      return users.map((user, index) => {
                        const userId = user._id || `fallback-${index}`;
                        const userEmail = user.email || 'No email';
                        const userName = user.name || userEmail;
                        const companyName = user.onboarding?.companyName || user.company || userEmail;
                        
                        return (
                          <SelectItem key={`bulk-assign-user-${userId}`} value={userId}>
                            {userName} ({companyName})
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="bulkBillingStartDate">Billing Start Date</Label>
                <Input
                  id="bulkBillingStartDate"
                  type="date"
                  value={assignForm.billingStartDate}
                  onChange={(e) => setAssignForm({ ...assignForm, billingStartDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="bulkNotes">Notes</Label>
                <Textarea
                  id="bulkNotes"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder="Optional bulk assignment notes"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowBulkAssignModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkAssign}
                disabled={isSubmitting || !assignForm.userId || phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  `Assign ${phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length} Numbers`
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Unassign Phone Numbers Modal */}
        <Dialog open={showBulkUnassignModal} onOpenChange={setShowBulkUnassignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Unassign Phone Numbers</DialogTitle>
              <DialogDescription>
                Unassign {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length} assigned phone numbers from their users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Show selected numbers summary */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <Label className="text-sm font-medium">Selected Numbers Summary</Label>
                <div className="mt-2 text-sm space-y-1">
                  <div>Total Selected: {selectedNumbers.size}</div>
                  <div className="text-orange-600">
                    Assigned for Unassignment: {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length}
                  </div>
                  {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'assigned').length > 0 && (
                    <div className="text-yellow-600">
                      Not Assigned: {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'assigned').length} (will be skipped)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="bulkUnassignReason">Reason (Optional)</Label>
                <Textarea
                  id="bulkUnassignReason"
                  value={unassignForm.reason}
                  onChange={(e) => setUnassignForm({ ...unassignForm, reason: e.target.value })}
                  placeholder="Reason for bulk unassignment..."
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={unassignForm.cancelPendingBilling}
                    onCheckedChange={(checked) => setUnassignForm({ ...unassignForm, cancelPendingBilling: !!checked })}
                  />
                  <Label htmlFor="bulkCancelPendingBilling" className="text-sm font-medium">
                    Cancel pending billing records
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={unassignForm.createRefund}
                    onCheckedChange={(checked) => setUnassignForm({ ...unassignForm, createRefund: !!checked })}
                  />
                  <Label htmlFor="bulkCreateRefund" className="text-sm font-medium">
                    Create refund for each number
                  </Label>
                </div>

                {unassignForm.createRefund && (
                  <div className="ml-6">
                    <Label htmlFor="bulkRefundAmount">Refund Amount (per number)</Label>
                    <Input
                      id="bulkRefundAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={unassignForm.refundAmount}
                      onChange={(e) => setUnassignForm({ ...unassignForm, refundAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This amount will be refunded for each unassigned number
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowBulkUnassignModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmBulkUnassign}
                disabled={isSubmitting || phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length === 0}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unassigning...
                  </>
                ) : (
                  `Unassign ${phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length} Numbers`
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Unassign Confirmation Dialog */}
        <AlertDialog open={showBulkUnassignConfirm} onOpenChange={setShowBulkUnassignConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Bulk Unassignment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unassign {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length} phone numbers? This will make them available again and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowBulkUnassignConfirm(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmBulkUnassign}
                disabled={isSubmitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unassigning...
                  </>
                ) : (
                  'Unassign Numbers'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reserve Phone Number Modal */}
        <Dialog open={showReserveModal} onOpenChange={setShowReserveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.reserve.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.reserve.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reserveReason">{t('phoneNumbers.admin.modals.reserve.fields.reason')} *</Label>
                <Textarea
                  id="reserveReason"
                  value={reserveForm.reason}
                  onChange={(e) => setReserveForm({ ...reserveForm, reason: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.reserve.fields.reason')}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reservedUntil">{t('phoneNumbers.admin.modals.reserve.fields.reservedUntil')}</Label>
                <Input
                  id="reservedUntil"
                  type="datetime-local"
                  value={reserveForm.reservedUntil}
                  onChange={(e) => setReserveForm({ ...reserveForm, reservedUntil: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If not specified, the number will be reserved for 7 days
                </p>
              </div>
              
              <div>
                <Label htmlFor="reserveNotes">{t('phoneNumbers.admin.modals.reserve.fields.notes')}</Label>
                <Textarea
                  id="reserveNotes"
                  value={reserveForm.notes}
                  onChange={(e) => setReserveForm({ ...reserveForm, notes: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.reserve.fields.notes')}
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowReserveModal(false)}>
                {t('phoneNumbers.admin.modals.reserve.buttons.cancel')}
              </Button>
              <Button
                onClick={handleReservePhoneNumber}
                disabled={isSubmitting || !reserveForm.reason.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.reserve.buttons.reserving')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.reserve.buttons.reserve')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Suspend Phone Number Modal */}
        <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.suspend.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.suspend.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="suspendReason">{t('phoneNumbers.admin.modals.suspend.fields.reason')} *</Label>
                <Textarea
                  id="suspendReason"
                  value={suspendForm.reason}
                  onChange={(e) => setSuspendForm({ ...suspendForm, reason: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.suspend.fields.reason')}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={suspendForm.suspendBilling}
                    onCheckedChange={(checked) => setSuspendForm({ ...suspendForm, suspendBilling: !!checked })}
                  />
                  <Label htmlFor="suspendBilling" className="text-sm font-medium">
                    Suspend billing for this number
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Pending billing records will be marked as suspended
                </p>
              </div>

                              <div>
                <Label htmlFor="autoResumeDate">{t('phoneNumbers.admin.modals.suspend.fields.suspendedUntil')}</Label>
                <Input
                  id="autoResumeDate"
                  type="datetime-local"
                  value={suspendForm.autoResumeDate}
                  onChange={(e) => setSuspendForm({ ...suspendForm, autoResumeDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If specified, the number will automatically resume on this date
                </p>
              </div>
              
              <div>
                <Label htmlFor="suspendNotes">{t('phoneNumbers.admin.modals.suspend.fields.notes')}</Label>
                <Textarea
                  id="suspendNotes"
                  value={suspendForm.notes}
                  onChange={(e) => setSuspendForm({ ...suspendForm, notes: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.suspend.fields.notes')}
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowSuspendModal(false)}>
                {t('phoneNumbers.admin.modals.suspend.buttons.cancel')}
              </Button>
              <Button
                onClick={handleSuspendPhoneNumber}
                disabled={isSubmitting || !suspendForm.reason.trim()}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.suspend.buttons.suspending')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.suspend.buttons.suspend')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Phone Number Modal */}
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.cancel.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.cancel.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cancelReason">{t('phoneNumbers.admin.modals.cancel.fields.reason')} *</Label>
                <Textarea
                  id="cancelReason"
                  value={cancelForm.reason}
                  onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.cancel.fields.reason')}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
                <Input
                  id="gracePeriodDays"
                  type="number"
                  min="0"
                  max="365"
                  value={cancelForm.gracePeriodDays}
                  onChange={(e) => setCancelForm({ ...cancelForm, gracePeriodDays: parseInt(e.target.value) || 30 })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number will be permanently deleted after this many days (0 = immediate deletion)
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={cancelForm.cancelBilling}
                    onCheckedChange={(checked) => setCancelForm({ ...cancelForm, cancelBilling: !!checked })}
                  />
                  <Label htmlFor="cancelBilling" className="text-sm font-medium">
                    Cancel all pending billing
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={cancelForm.createRefund}
                    onCheckedChange={(checked) => setCancelForm({ ...cancelForm, createRefund: !!checked })}
                  />
                  <Label htmlFor="createRefund" className="text-sm font-medium">
                    Create refund
                  </Label>
                </div>
                
                {cancelForm.createRefund && (
                  <div className="ml-6">
                    <Label htmlFor="refundAmount">Refund Amount</Label>
                    <Input
                      id="refundAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={cancelForm.refundAmount}
                      onChange={(e) => setCancelForm({ ...cancelForm, refundAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="cancelNotes">Additional Notes</Label>
                <Textarea
                  id="cancelNotes"
                  value={cancelForm.notes}
                  onChange={(e) => setCancelForm({ ...cancelForm, notes: e.target.value })}
                  placeholder="Optional additional notes..."
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCancelPhoneNumber}
                disabled={isSubmitting || !cancelForm.reason.trim()}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Number'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Unreserve Phone Number Modal */}
        <Dialog open={showUnreserveModal} onOpenChange={setShowUnreserveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unreserve Phone Number</DialogTitle>
              <DialogDescription>
                Make {selectedNumber?.number} available again
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="unreserveReason">Reason for Unreserving *</Label>
                <Textarea
                  id="unreserveReason"
                  value={unreserveForm.reason}
                  onChange={(e) => setUnreserveForm({ ...unreserveForm, reason: e.target.value })}
                  placeholder="Enter reason for unreserving this number..."
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="unreserveNotes">Additional Notes</Label>
                <Textarea
                  id="unreserveNotes"
                  value={unreserveForm.notes}
                  onChange={(e) => setUnreserveForm({ ...unreserveForm, notes: e.target.value })}
                  placeholder="Optional additional notes..."
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowUnreserveModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUnreservePhoneNumber}
                disabled={isSubmitting || !unreserveForm.reason.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unreserving...
                  </>
                ) : (
                  'Unreserve Number'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Phone Number Reputation Modal - Complete version like user-facing */}
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
                  normalizeReputationStatus(reputationData.status) === 'safe' ? 'bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 border-green-300 dark:from-green-950/50 dark:via-green-900/50 dark:to-emerald-950/50 dark:border-green-600' :
                  normalizeReputationStatus(reputationData.status) === 'neutral' ? 'bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 border-blue-300 dark:from-blue-950/50 dark:via-blue-900/50 dark:to-indigo-950/50 dark:border-blue-600' :
                  normalizeReputationStatus(reputationData.status) === 'annoying' ? 'bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 border-orange-300 dark:from-orange-950/50 dark:via-orange-900/50 dark:to-yellow-950/50 dark:border-orange-600' :
                  normalizeReputationStatus(reputationData.status) === 'dangerous' ? 'bg-gradient-to-br from-red-50 via-red-100 to-rose-100 border-red-300 dark:from-red-950/50 dark:via-red-900/50 dark:to-rose-950/50 dark:border-red-600' :
                  'bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 border-green-300 dark:from-green-950/50 dark:via-green-900/50 dark:to-emerald-950/50 dark:border-green-600'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl shadow-md ${
                        normalizeReputationStatus(reputationData.status) === 'safe' ? 'bg-green-200 dark:bg-green-800/50' :
                        normalizeReputationStatus(reputationData.status) === 'neutral' ? 'bg-blue-200 dark:bg-blue-800/50' :
                        normalizeReputationStatus(reputationData.status) === 'annoying' ? 'bg-orange-200 dark:bg-orange-800/50' :
                        normalizeReputationStatus(reputationData.status) === 'dangerous' ? 'bg-red-200 dark:bg-red-800/50' :
                        'bg-green-200 dark:bg-green-800/50'
                      }`}>
                        {getReputationIcon(reputationData.status)}
                      </div>
                      <div>
                        <h3 className={`text-2xl font-bold capitalize ${
                          normalizeReputationStatus(reputationData.status) === 'safe' ? 'text-green-800 dark:text-green-200' :
                          normalizeReputationStatus(reputationData.status) === 'neutral' ? 'text-blue-800 dark:text-blue-200' :
                          normalizeReputationStatus(reputationData.status) === 'annoying' ? 'text-orange-800 dark:text-orange-200' :
                          normalizeReputationStatus(reputationData.status) === 'dangerous' ? 'text-red-800 dark:text-red-200' :
                          'text-green-800 dark:text-green-200'
                        }`}>
                          {t(`phoneNumbers.reputation.statusDescriptions.${reputationData.status === 'unknown' ? 'safe' : reputationData.status}`)}
                        </h3>
                        <p className={`text-sm font-medium ${
                          normalizeReputationStatus(reputationData.status) === 'safe' ? 'text-green-700 dark:text-green-300' :
                          normalizeReputationStatus(reputationData.status) === 'neutral' ? 'text-blue-700 dark:text-blue-300' :
                          normalizeReputationStatus(reputationData.status) === 'annoying' ? 'text-orange-700 dark:text-orange-300' :
                          normalizeReputationStatus(reputationData.status) === 'dangerous' ? 'text-red-700 dark:text-red-300' :
                          'text-green-700 dark:text-green-300'
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
                        normalizeReputationStatus(reputationData.status) === 'safe' ? 'text-green-800 dark:text-green-200' :
                        normalizeReputationStatus(reputationData.status) === 'neutral' ? 'text-blue-800 dark:text-blue-200' :
                        normalizeReputationStatus(reputationData.status) === 'annoying' ? 'text-orange-800 dark:text-orange-200' :
                        normalizeReputationStatus(reputationData.status) === 'dangerous' ? 'text-red-800 dark:text-red-200' :
                        'text-green-800 dark:text-green-200'
                      }`}>
                        {t('phoneNumbers.reputation.sections.dangerLevel')}
                      </Label>
                      <span className={`text-2xl font-bold ${
                        normalizeReputationStatus(reputationData.status) === 'safe' ? 'text-green-900 dark:text-green-100' :
                        normalizeReputationStatus(reputationData.status) === 'neutral' ? 'text-blue-900 dark:text-blue-100' :
                        normalizeReputationStatus(reputationData.status) === 'annoying' ? 'text-orange-900 dark:text-orange-100' :
                        normalizeReputationStatus(reputationData.status) === 'dangerous' ? 'text-red-900 dark:text-red-100' :
                        'text-green-900 dark:text-green-100'
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
                <div className="p-4 bg-slate-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Shield className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('phoneNumbers.reputation.sections.noData')}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
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

        {/* Bulk Reputation Progress Modal */}
        <Dialog open={showBulkReputationModal} onOpenChange={setShowBulkReputationModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>Bulk Reputation Check Progress</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{bulkReputationProgress.completed} / {bulkReputationProgress.total}</span>
                </div>
                <Progress 
                  value={(bulkReputationProgress.completed / bulkReputationProgress.total) * 100} 
                  className="h-2"
                />
              </div>

              {/* Current Status */}
              {bulkReputationProgress.isRunning && (
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Currently checking: {bulkReputationProgress.current}
                    </p>
                    <p className="text-xs text-blue-700">
                      Random delay (3-8 seconds) between requests to avoid rate limiting
                    </p>
                  </div>
                </div>
              )}

              {/* Results Summary */}
              {Object.keys(bulkReputationProgress.results).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Results Summary</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(bulkReputationProgress.results).map(([phoneNumber, result]) => (
                      <div key={phoneNumber} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <span className="font-mono text-sm">{phoneNumber}</span>
                        <div className="flex items-center space-x-2">
                          {result.success ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <Badge 
                                variant="outline"
                                className={getReputationBadgeClasses(result.status || 'unknown')}
                              >
                                {result.status}
                              </Badge>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-xs text-red-600">{result.error}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close button when completed */}
              {!bulkReputationProgress.isRunning && bulkReputationProgress.completed > 0 && (
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={() => setShowBulkReputationModal(false)}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Phone Numbers Modal */}
        <Dialog open={showImportModal} onOpenChange={(open) => {
          setShowImportModal(open);
          if (!open) resetImportModal();
        }}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Import Phone Numbers</span>
              </DialogTitle>
              <DialogDescription>
                Upload a CSV file to import phone numbers. Download the template to see the required format.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {!importResults && !showColumnMapping && (
                <>
                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="import-file" className="dark:text-gray-200">Select CSV File</Label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800/50">
                      <input
                        id="import-file"
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="import-file"
                        className="cursor-pointer flex flex-col items-center space-y-2"
                      >
                        <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        <div className="text-sm dark:text-gray-300">
                          <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">CSV files up to 10MB</p>
                      </label>
                    </div>
                    {importFile && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                        <span>Selected: {importFile.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImportFile(null);
                            setShowColumnMapping(false);
                            setCsvHeaders([]);
                            setColumnMapping({});
                          }}
                          className="h-auto p-1 dark:hover:bg-gray-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">How it works</h4>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Upload any CSV file and we'll automatically match your columns to our fields. 
                      You can review and adjust the mapping before importing.
                    </p>
                  </div>
                </>
              )}

              {/* Column Mapping */}
              {showColumnMapping && !importResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium dark:text-gray-200">Map Your Columns</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowColumnMapping(false);
                        setImportFile(null);
                        setCsvHeaders([]);
                        setColumnMapping({});
                      }}
                      className="dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>
                  
                  {/* CSV Mapping Section */}
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">CSV Data Mapping</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Map your CSV columns to phone number and technical data fields:
                      </p>
                      <div className="grid gap-3">
                        {[
                                                { key: 'number', label: 'Phone Number', required: true },
                      { key: 'description', label: 'Description/Notes', required: false },
                      { key: 'region', label: 'Region/Area', required: false },
                      { key: 'timeZone', label: 'Time Zone', required: false },
                        ].map(field => (
                                             <div key={field.key} className="flex items-center space-x-3">
                         <div className="w-32">
                           <Label className={`text-sm ${field.required ? 'font-medium' : ''} dark:text-gray-300`}>
                             {field.label}
                             {field.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                           </Label>
                         </div>
                        <div className="flex-1">
                          <Select
                            value={columnMapping[field.key] || ''}
                            onValueChange={(value) => 
                              setColumnMapping(prev => ({
                                ...prev,
                                [field.key]: value === 'none' ? '' : value
                              }))
                            }
                          >
                            <SelectTrigger className="dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                              <SelectItem value="none" className="dark:hover:bg-gray-700 dark:text-gray-300">-- No mapping --</SelectItem>
                              {csvHeaders.map(header => (
                                <SelectItem key={header} value={header} className="dark:hover:bg-gray-700 dark:text-gray-300">
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {columnMapping[field.key] && (
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                        )}
                      </div>
                    ))}
                      </div>
                    </div>

                    {/* System Options Section */}
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">System Options</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Select default values for all imported numbers:
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium dark:text-gray-300">
                            Country <span className="text-red-500 dark:text-red-400">*</span>
                          </Label>
                          <Select value={importDefaults.country} onValueChange={(value) => 
                            setImportDefaults(prev => ({ ...prev, country: value }))
                          }>
                            <SelectTrigger className="dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                              <SelectValue placeholder="Select country..." />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                              {countries.map(country => (
                                <SelectItem key={country._id} value={country._id} className="dark:hover:bg-gray-700 dark:text-gray-300">
                                  {country.name} (+{country.phoneCode})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium dark:text-gray-300">
                            Provider <span className="text-red-500 dark:text-red-400">*</span>
                          </Label>
                          <Select value={importDefaults.provider} onValueChange={(value) => 
                            setImportDefaults(prev => ({ ...prev, provider: value }))
                          }>
                            <SelectTrigger className="dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                              <SelectValue placeholder="Select provider..." />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                              {providers.map(provider => (
                                <SelectItem key={provider._id} value={provider._id} className="dark:hover:bg-gray-700 dark:text-gray-300">
                                  {provider.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium dark:text-gray-300">
                            Number Type <span className="text-red-500 dark:text-red-400">*</span>
                          </Label>
                          <Select value={importDefaults.numberType} onValueChange={(value) => 
                            setImportDefaults(prev => ({ ...prev, numberType: value }))
                          }>
                            <SelectTrigger className="dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                              {[
                                { id: 'geographic', label: t('phoneNumbers.admin.modals.edit.numberTypes.geographic'), value: 'Geographic/Local' },
                                { id: 'mobile', label: t('phoneNumbers.admin.modals.edit.numberTypes.mobile'), value: 'Mobile' },
                                { id: 'national', label: t('phoneNumbers.admin.modals.edit.numberTypes.national'), value: 'National' },
                                { id: 'tollfree', label: t('phoneNumbers.admin.modals.edit.numberTypes.tollfree'), value: 'Toll-free' },
                                { id: 'shared', label: t('phoneNumbers.admin.modals.edit.numberTypes.shared'), value: 'Shared Cost' },
                                { id: 'npv', label: t('phoneNumbers.admin.modals.edit.numberTypes.npv'), value: 'NPV (Verified Numbers)' },
                                { id: 'premium', label: t('phoneNumbers.admin.modals.edit.numberTypes.premium'), value: 'Premium' }
                              ].map(option => (
                                <SelectItem key={option.id} value={option.value} className="dark:hover:bg-gray-700 dark:text-gray-300">
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium dark:text-gray-300">
                            Currency <span className="text-red-500 dark:text-red-400">*</span>
                          </Label>
                          <Select value={importDefaults.currency} onValueChange={(value) => 
                            setImportDefaults(prev => ({ ...prev, currency: value }))
                          }>
                            <SelectTrigger className="dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                              <SelectValue placeholder="Select currency..." />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                              <SelectItem value="USD" className="dark:hover:bg-gray-700 dark:text-gray-300">USD</SelectItem>
                              <SelectItem value="EUR" className="dark:hover:bg-gray-700 dark:text-gray-300">EUR</SelectItem>
                              <SelectItem value="GBP" className="dark:hover:bg-gray-700 dark:text-gray-300">GBP</SelectItem>
                              <SelectItem value="CAD" className="dark:hover:bg-gray-700 dark:text-gray-300">CAD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>



                        <div className="space-y-2 col-span-2">
                          <Label className="text-sm font-medium dark:text-gray-300">
                            Capabilities <span className="text-red-500 dark:text-red-400">*</span>
                          </Label>
                          <div className="flex flex-wrap gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                            {(['voice', 'sms', 'fax', 'data'] as PhoneNumberCapability[]).map((capability) => (
                              <div key={capability} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={importDefaults.capabilities.includes(capability)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setImportDefaults(prev => ({
                                        ...prev,
                                        capabilities: [...prev.capabilities, capability]
                                      }));
                                    } else {
                                      setImportDefaults(prev => ({
                                        ...prev,
                                        capabilities: prev.capabilities.filter(c => c !== capability)
                                      }));
                                    }
                                  }}
                                />
                                <Label className="text-sm capitalize dark:text-gray-300">
                                  {t(`phoneNumbers.admin.modals.edit.capabilities.${capability}`)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 col-span-2">
                          <Label className="text-sm font-medium dark:text-gray-300">Connection Type</Label>
                          <Select 
                            value={importDefaults.connectionType || 'none'} 
                            onValueChange={(value: ConnectionType | 'none') => 
                              setImportDefaults(prev => ({ ...prev, connectionType: value === 'none' ? undefined : value }))
                            }
                          >
                            <SelectTrigger className="dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                              <SelectValue placeholder="Select connection type..." />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                              <SelectItem value="none" className="dark:hover:bg-gray-700 dark:text-gray-300">
                                {t('phoneNumbers.admin.modals.edit.connectionTypes.none')}
                              </SelectItem>
                              <SelectItem value="ip_routing" className="dark:hover:bg-gray-700 dark:text-gray-300">
                                {t('phoneNumbers.admin.modals.edit.connectionTypes.ip_routing')}
                              </SelectItem>
                              <SelectItem value="credentials" className="dark:hover:bg-gray-700 dark:text-gray-300">
                                {t('phoneNumbers.admin.modals.edit.connectionTypes.credentials')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Connection Fields Mapping */}
                    {importDefaults.connectionType && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Connection Data Mapping</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Map your CSV columns to connection fields for {importDefaults.connectionType === 'ip_routing' ? 'IP Routing' : 'Credentials'}:
                        </p>
                        
                        <div className="grid gap-3">
                          {importDefaults.connectionType === 'ip_routing' && [
                            { key: 'ipAddress', label: 'IP Address', required: false },
                            { key: 'port', label: 'Port', required: false },
                          ].map(field => (
                            <div key={field.key} className="flex items-center space-x-3">
                              <div className="w-32">
                                <Label className="text-sm dark:text-gray-300">
                                  {field.label}
                                </Label>
                              </div>
                              <div className="flex-1">
                                <Select
                                  value={columnMapping[field.key] || ''}
                                  onValueChange={(value) => 
                                    setColumnMapping(prev => ({
                                      ...prev,
                                      [field.key]: value === 'none' ? '' : value
                                    }))
                                  }
                                >
                                  <SelectTrigger className="dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                                    <SelectValue placeholder="Select column..." />
                                  </SelectTrigger>
                                  <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                                    <SelectItem value="none" className="dark:hover:bg-gray-700 dark:text-gray-300">-- No mapping --</SelectItem>
                                    {csvHeaders.map(header => (
                                      <SelectItem key={header} value={header} className="dark:hover:bg-gray-700 dark:text-gray-300">
                                        {header}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {columnMapping[field.key] && (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                              )}
                            </div>
                          ))}

                          {importDefaults.connectionType === 'credentials' && [
                            { key: 'login', label: 'Login/Username', required: false },
                            { key: 'password', label: 'Password', required: false },
                            { key: 'domain', label: 'Domain', required: false },
                            { key: 'credentialsPort', label: 'Port', required: false },
                          ].map(field => (
                            <div key={field.key} className="flex items-center space-x-3">
                              <div className="w-32">
                                <Label className="text-sm dark:text-gray-300">
                                  {field.label}
                                </Label>
                              </div>
                              <div className="flex-1">
                                <Select
                                  value={columnMapping[field.key] || ''}
                                  onValueChange={(value) => 
                                    setColumnMapping(prev => ({
                                      ...prev,
                                      [field.key]: value === 'none' ? '' : value
                                    }))
                                  }
                                >
                                  <SelectTrigger className="dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                                    <SelectValue placeholder="Select column..." />
                                  </SelectTrigger>
                                  <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                                    <SelectItem value="none" className="dark:hover:bg-gray-700 dark:text-gray-300">-- No mapping --</SelectItem>
                                    {csvHeaders.map(header => (
                                      <SelectItem key={header} value={header} className="dark:hover:bg-gray-700 dark:text-gray-300">
                                        {header}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {columnMapping[field.key] && (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      <strong>Required fields:</strong> Make sure the phone number is mapped and all system options are selected.
                    </p>
                  </div>
                </div>
              )}

              {/* Import Progress */}
              {isImporting && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-medium dark:text-gray-200">Importing phone numbers...</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">This may take a few moments</p>
                    </div>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}

              {/* Import Results */}
              {importResults && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResults.total}</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">Total Records</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{importResults.success}</div>
                      <div className="text-sm text-green-700 dark:text-green-300">Successful</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{importResults.errors.length}</div>
                      <div className="text-sm text-red-700 dark:text-red-300">Errors</div>
                    </div>
                  </div>

                  {/* Error Details */}
                  {importResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-700 dark:text-red-400">Import Errors</h4>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {importResults.errors.map((error, index) => (
                          <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
                            <div className="font-medium text-red-700 dark:text-red-400">Row {error.row}</div>
                            <div className="text-red-600 dark:text-red-300">{error.error}</div>
                            {error.data && (
                              <div className="text-xs text-red-500 dark:text-red-400 mt-1 font-mono">
                                {JSON.stringify(error.data)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t dark:border-gray-700 bg-white dark:bg-gray-900">
              <Button variant="outline" onClick={() => {
                setShowImportModal(false);
                resetImportModal();
              }} className="dark:border-gray-600 dark:hover:bg-gray-700">
                {importResults ? 'Close' : 'Cancel'}
              </Button>
              {showColumnMapping && !importResults && !isImporting && (
                <Button 
                  onClick={handleImportPhoneNumbers}
                  disabled={!importFile || !areRequiredFieldsMapped()}
                  className="dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Numbers
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </PageLayout>
    </MainLayout>
  );
}