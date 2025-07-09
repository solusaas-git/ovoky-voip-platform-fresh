'use client';

/*
 * SmsRates Component - Color Usage Philosophy:
 * 
 * - Brand colors (colors.primary, colors.secondary, colors.accent): Used for icons, backgrounds, and accents
 * - Theme-aware text colors (.text-brand): Used for main stat values for readability
 * - Tailwind semantic colors (.text-muted-foreground): Used for secondary text
 * 
 * This ensures brand identity is maintained while text remains readable in both light and dark modes.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '@/lib/i18n';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  RefreshCw, 
  Download,
  MessageSquare,
  Globe,
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Copy,
  Users,
  // Eye, // Unused
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/lib/AuthContext';
import { useBranding } from '@/hooks/useBranding';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { UserAssignmentDialog } from './UserAssignmentDialog';
import { UserSmsRates } from './UserSmsRates';

interface SmsRateDeck {
  id: string;
  name: string;
  description: string;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  rateCount: number;
  assignedUsers: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface SmsRateDecksData {
  rateDecks: SmsRateDeck[];
  total: number;
}

interface SmsRateDecksStats {
  total: number;
  active: number;
  totalRates: number;
  totalAssignedUsers: number;
}

export function SmsRates() {
  const { user } = useAuth();
  const { colors } = useBranding();
  const { t } = useTranslations();
  // const { company, getGradientStyle, features } = useBranding(); // Unused
  
  // All hooks must be called before any conditional returns
  const [rateDecksData, setRateDecksData] = useState<SmsRateDecksData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(50);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    isActive: 'all',
    isDefault: 'all',
  });

  // Form state for add/edit rate deck
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRateDeck, setEditingRateDeck] = useState<SmsRateDeck | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: 'USD',
    isActive: true,
    isDefault: false,
  });

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rateDeckToDelete, setRateDeckToDelete] = useState<SmsRateDeck | null>(null);

  // Assignment dialog state
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [rateDeckToAssign, setRateDeckToAssign] = useState<SmsRateDeck | null>(null);

  // Calculate stats function
  const calculateStats = useCallback((rateDecks: SmsRateDeck[]): SmsRateDecksStats => {
    const stats: SmsRateDecksStats = {
      total: rateDecks.length,
      active: 0,
      totalRates: 0,
      totalAssignedUsers: 0,
    };

    if (rateDecks.length === 0) return stats;

    stats.active = rateDecks.filter(rd => rd.isActive).length;
    stats.totalRates = rateDecks.reduce((sum, rd) => sum + rd.rateCount, 0);
    stats.totalAssignedUsers = rateDecks.reduce((sum, rd) => sum + rd.assignedUsers, 0);

    return stats;
  }, []);

  const fetchRateDecks = useCallback(async (page: number = currentPage, customRecordsPerPage?: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const limit = customRecordsPerPage || recordsPerPage;
      const offset = (page - 1) * limit;

      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
        ...(filters.name && { name: filters.name }),
        ...(filters.isActive !== 'all' && { isActive: filters.isActive }),
        ...(filters.isDefault !== 'all' && { isDefault: filters.isDefault }),
      });

      const response = await fetch(`/api/rates/sms/decks?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // If API doesn't exist yet (404), show empty state instead of error
        if (response.status === 404) {
          const emptyData: SmsRateDecksData = {
            rateDecks: [],
            total: 0,
          };
          setRateDecksData(emptyData);
          setTotalRecords(0);
          setLastRefresh(new Date());
          return;
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch SMS rate decks`);
      }

      const data: SmsRateDecksData = await response.json();
      console.log('SMS rate decks API response:', { deckCount: data.rateDecks?.length });
      
      setRateDecksData(data);
      setTotalRecords(data.total || data.rateDecks?.length || 0);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching SMS rate decks:', err);
      
      let errorMessage = 'Failed to fetch SMS rate decks';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, recordsPerPage, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      isActive: 'all',
      isDefault: 'all',
    });
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchRateDecks(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchRateDecks(newPage);
  };

  const handleLimitChange = (value: string) => {
    const newLimit = parseInt(value);
    setRecordsPerPage(newLimit);
    setCurrentPage(1);
    fetchRateDecks(1, newLimit);
  };

  const exportToCsv = () => {
    if (!rateDecksData?.rateDecks) return;

    const headers = [
      'Name',
      'Description',
      'Currency',
      'Rate Count',
      'Assigned Users',
      'Status',
      'Default',
      'Created At'
    ];

    const csvContent = [
      headers.join(','),
      ...rateDecksData.rateDecks.map(deck => [
        deck.name || '',
        deck.description || '',
        deck.currency || '',
        deck.rateCount || '',
        deck.assignedUsers || '',
        deck.isActive ? 'Active' : 'Inactive',
        deck.isDefault ? 'Yes' : 'No',
        format(new Date(deck.createdAt), 'yyyy-MM-dd HH:mm:ss')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sms_rate_decks_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const rateDeckData = {
        name: formData.name,
        description: formData.description,
        currency: formData.currency,
        isActive: formData.isActive,
        isDefault: formData.isDefault,
      };

      const url = editingRateDeck 
        ? `/api/rates/sms/decks/${editingRateDeck.id}`
        : '/api/rates/sms/decks';
      
      const method = editingRateDeck ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rateDeckData),
      });

      if (!response.ok) {
        // If API doesn't exist yet (404), show helpful message
        if (response.status === 404) {
          throw new Error(`API endpoint not implemented yet. Please implement ${method} ${url} to ${editingRateDeck ? 'update' : 'create'} SMS rate decks.`);
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to ${editingRateDeck ? 'update' : 'create'} SMS rate deck`);
      }

      toast.success(`SMS rate deck ${editingRateDeck ? 'updated' : 'created'} successfully`);

      setIsFormOpen(false);
      setEditingRateDeck(null);
      setFormData({
        name: '',
        description: '',
        currency: 'USD',
        isActive: true,
        isDefault: false,
      });
      fetchRateDecks();
    } catch (error) {
      console.error('Error saving SMS rate deck:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save SMS rate deck';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (rateDeck: SmsRateDeck) => {
    setEditingRateDeck(rateDeck);
    setFormData({
      name: rateDeck.name,
      description: rateDeck.description,
      currency: rateDeck.currency,
      isActive: rateDeck.isActive,
      isDefault: rateDeck.isDefault,
    });
    setIsFormOpen(true);
  };

  const handleDuplicate = async (rateDeck: SmsRateDeck) => {
    try {
      const response = await fetch(`/api/rates/sms/decks/${rateDeck.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If API doesn't exist yet (404), show helpful message
        if (response.status === 404) {
          throw new Error(`API endpoint not implemented yet. Please implement POST /api/rates/sms/decks/{id}/duplicate to duplicate SMS rate decks.`);
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to duplicate SMS rate deck');
      }

      toast.success('SMS rate deck duplicated successfully');
      fetchRateDecks();
    } catch (error) {
      console.error('Error duplicating SMS rate deck:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate SMS rate deck';
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (rateDeck: SmsRateDeck) => {
    setRateDeckToDelete(rateDeck);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!rateDeckToDelete) return;
    
    try {
      const response = await fetch(`/api/rates/sms/decks/${rateDeckToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If API doesn't exist yet (404), show helpful message
        if (response.status === 404) {
          throw new Error(`API endpoint not implemented yet. Please implement DELETE /api/rates/sms/decks/{id} to delete SMS rate decks.`);
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete SMS rate deck');
      }

      toast.success('SMS rate deck deleted successfully');
      setDeleteDialogOpen(false);
      setRateDeckToDelete(null);
      fetchRateDecks();
    } catch (error) {
      console.error('Error deleting SMS rate deck:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete SMS rate deck';
      toast.error(errorMessage);
    }
  };

  const handleAssignUsers = (rateDeck: SmsRateDeck) => {
    setRateDeckToAssign(rateDeck);
    setAssignmentDialogOpen(true);
  };

  const handleManageRates = (rateDeck: SmsRateDeck) => {
    // Navigate to rate management for this deck
    window.location.href = `/rates/sms/decks/${rateDeck.id}/rates`;
  };

  useEffect(() => {
    fetchRateDecks(1);
  }, [fetchRateDecks]);

  // Calculate stats
  const stats = rateDecksData ? calculateStats(rateDecksData.rateDecks) : {
    total: 0,
    active: 0,
    totalRates: 0,
    totalAssignedUsers: 0,
  };

  const isAdmin = user?.role === 'admin';

  // If user is not an admin, show the user rates view
  if (!isAdmin) {
    return <UserSmsRates />;
  }

  if (isLoading && !rateDecksData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div 
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
              {t('rates.common.states.loading')}
            </h3>
            <p className="text-muted-foreground">{t('rates.smsRates.description')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-destructive">{t('rates.common.states.error')}</CardTitle>
              <CardDescription>{t('rates.smsRates.errors.fetchFailed')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => fetchRateDecks()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
            >
              <MessageSquare className="h-4 w-4" />
              {t('rates.smsRates.title')}
            </div>
          </div>
          <p className="text-muted-foreground">
            {stats.total} rate deck{stats.total !== 1 ? 's' : ''} • {stats.active} active • {stats.totalRates} total rates
            {lastRefresh && (
              <span className="ml-2">
                • Last updated {format(lastRefresh, 'HH:mm:ss')}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchRateDecks()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('rates.common.actions.refresh')}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToCsv}
            disabled={!rateDecksData?.rateDecks || rateDecksData.rateDecks.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          {isAdmin && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm"
                  className="gap-2"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Plus className="h-4 w-4" />
                  Create Rate Deck
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleFormSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRateDeck ? 'Edit SMS Rate Deck' : 'Create SMS Rate Deck'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingRateDeck ? 'Update the rate deck details.' : 'Create a new SMS rate deck.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        {t('rates.smsRates.form.fields.name')}
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="col-span-3"
                        placeholder={t('rates.smsRates.form.fields.namePlaceholder')}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        {t('rates.smsRates.form.fields.description')}
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="col-span-3"
                        placeholder={t('rates.smsRates.form.fields.descriptionPlaceholder')}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="currency" className="text-right">
                        {t('rates.smsRates.form.fields.currency')}
                      </Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="isActive" className="text-right">
                        {t('rates.common.filters.status')}
                      </Label>
                      <Select
                        value={formData.isActive ? 'active' : 'inactive'}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value === 'active' }))}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t('rates.common.filters.active')}</SelectItem>
                          <SelectItem value="inactive">{t('rates.common.filters.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="isDefault" className="text-right">
                        {t('rates.common.filters.isDefault')}
                      </Label>
                      <Select
                        value={formData.isDefault ? 'yes' : 'no'}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, isDefault: value === 'yes' }))}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">{t('rates.common.filters.no')}</SelectItem>
                          <SelectItem value="yes">{t('rates.common.filters.yes')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" style={{ backgroundColor: colors.primary }}>
                      {editingRateDeck ? t('rates.smsRates.form.title.edit') : t('rates.smsRates.form.title.add')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rate Decks */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('rates.smsRates.stats.totalDecks')}</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.total}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <MessageSquare className="h-6 w-6" style={{ color: colors.primary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Rate Decks */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('rates.smsRates.stats.activeDecks')}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.active}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/50 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Rates */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('rates.smsRates.stats.totalRates')}</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.totalRates}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.secondary}20` }}
              >
                <Globe className="h-6 w-6" style={{ color: colors.secondary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Users */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('rates.smsRates.stats.assignedUsers')}</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.totalAssignedUsers}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.accent}20` }}
              >
                <Users className="h-6 w-6" style={{ color: colors.accent }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-5 w-5" style={{ color: colors.primary }} />
                Filters
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowFilters(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                  placeholder="Filter by name"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.isActive}
                  onValueChange={(value) => handleFilterChange('isActive', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default</Label>
                <Select
                  value={filters.isDefault}
                  onValueChange={(value) => handleFilterChange('isDefault', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Default</SelectItem>
                    <SelectItem value="false">Not Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={applyFilters}
                disabled={isLoading}
                className="gap-2"
                style={{ backgroundColor: colors.primary }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Apply Filters
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={clearFilters}
                disabled={isLoading}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rate Decks Table */}
      {stats.total === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div 
                className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
              >
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                  {t('rates.smsRates.errors.noDecksFound')}
                </h3>
                <p className="text-muted-foreground">
                  {isAdmin 
                    ? t('rates.smsRates.errors.noDecksFound')
                    : t('rates.smsRates.errors.noDecksFound')
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-5 w-5" style={{ color: colors.primary }} />
                {t('rates.smsRates.title')}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {startRecord}-{endRecord} of {totalRecords} rate decks
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('rates.smsRates.table.headers.name')}</TableHead>
                    <TableHead>{t('rates.smsRates.table.headers.description')}</TableHead>
                    <TableHead>{t('rates.smsRates.table.headers.currency')}</TableHead>
                    <TableHead className="text-center">{t('rates.smsRates.table.headers.rateCount')}</TableHead>
                    <TableHead className="text-center">{t('rates.smsRates.table.headers.assignedUsers')}</TableHead>
                    <TableHead className="text-center">{t('rates.smsRates.table.headers.status')}</TableHead>
                    <TableHead className="text-center">{t('rates.smsRates.table.headers.isDefault')}</TableHead>
                    <TableHead>{t('rates.smsRates.table.headers.created')}</TableHead>
                    <TableHead className="text-right">{t('rates.smsRates.table.headers.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateDecksData?.rateDecks.map((deck) => (
                    <TableRow key={deck.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium text-foreground">{deck.name}</div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {deck.description || 'No description'}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-mono font-medium text-foreground">
                          {deck.currency}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {deck.rateCount}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {deck.assignedUsers}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant={deck.isActive ? 'default' : 'secondary'}>
                          {deck.isActive ? t('rates.common.filters.active') : t('rates.common.filters.inactive')}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant={deck.isDefault ? 'default' : 'outline'}>
                          {deck.isDefault ? t('rates.common.filters.yes') : t('rates.common.filters.no')}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        {format(new Date(deck.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManageRates(deck)}
                            className="h-8 w-8 p-0"
                            title={t('rates.common.actions.manageRates')}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssignUsers(deck)}
                            className="h-8 w-8 p-0"
                            title={t('rates.common.actions.assign')}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(deck)}
                            className="h-8 w-8 p-0"
                            title={t('rates.common.actions.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(deck)}
                            className="h-8 w-8 p-0"
                            title={t('rates.common.actions.duplicate')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(deck)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title={t('rates.common.actions.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          
          {/* Pagination */}
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startRecord}-{endRecord} of {totalRecords} rate decks
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Decks per page:</span>
                  <Select
                    value={recordsPerPage.toString()}
                    onValueChange={handleLimitChange}
                  >
                    <SelectTrigger className="w-[100px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete SMS Rate Deck</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the rate deck &quot;{rateDeckToDelete?.name}&quot;? This will also delete all rates in this deck and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Assignment Dialog */}
      <UserAssignmentDialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        rateDeck={rateDeckToAssign}
        rateDeckType="sms"
        onAssignmentComplete={() => {
          fetchRateDecks();
          setAssignmentDialogOpen(false);
        }}
      />
    </div>
  );
} 