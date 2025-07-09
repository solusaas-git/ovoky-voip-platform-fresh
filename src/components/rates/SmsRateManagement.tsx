'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  // CardDescription, // Unused 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge'; // Unused
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
  ArrowLeft,
  Phone
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
import { useTranslations } from '@/lib/i18n';
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
// import { Textarea } from '@/components/ui/textarea'; // Unused
import Link from 'next/link';

interface SmsRate {
  id: string;
  prefix: string;
  country: string;
  description: string;
  rate: number;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

interface SmsRateData {
  rates: SmsRate[];
  total: number;
}

interface SmsRateStats {
  total: number;
  avgRate: number;
  minRate: number;
  maxRate: number;
  uniqueCountries: number;
}

interface SmsRateManagementProps {
  rateDeckId: string;
}

export function SmsRateManagement({ rateDeckId }: SmsRateManagementProps) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const { colors } = useBranding();
  // const { company, getGradientStyle, features } = useBranding(); // Unused
  const [rateData, setRateData] = useState<SmsRateData | null>(null);
  const [rateDeckInfo, setRateDeckInfo] = useState<any>(null);
  const [countries, setCountries] = useState<any[]>([]);
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
    prefix: '',
    country: '',
    minRate: '',
    maxRate: '',
  });

  // Form state for add/edit rate
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<SmsRate | null>(null);
  const [formData, setFormData] = useState({
    prefix: '',
    country: '',
    description: '',
    rate: '',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<SmsRate | null>(null);

  const isAdmin = user?.role === 'admin';

  // Calculate rates statistics
  const calculateStats = (rates: SmsRate[]): SmsRateStats => {
    const stats: SmsRateStats = {
      total: rates.length,
      avgRate: 0,
      minRate: 0,
      maxRate: 0,
      uniqueCountries: 0,
    };

    if (rates.length === 0) return stats;

    const rateValues = rates.map(r => r.rate).filter(r => r > 0);
    const countries = new Set(rates.map(r => r.country).filter(c => c));

    if (rateValues.length > 0) {
      stats.avgRate = rateValues.reduce((sum, rate) => sum + rate, 0) / rateValues.length;
      stats.minRate = Math.min(...rateValues);
      stats.maxRate = Math.max(...rateValues);
    }

    stats.uniqueCountries = countries.size;

    return stats;
  };

  const stats = rateData ? calculateStats(rateData.rates) : {
    total: 0,
    avgRate: 0,
    minRate: 0,
    maxRate: 0,
    uniqueCountries: 0,
  };

  const fetchRateDeckInfo = async () => {
    try {
      const response = await fetch(`/api/rates/sms/decks/${rateDeckId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Rate deck not found, but don't set this as an error
          // Just leave rateDeckInfo as null and continue
          console.warn(`Rate deck ${rateDeckId} not found`);
          return;
        }
        throw new Error('Failed to fetch rate deck information');
      }

      const data = await response.json();
      setRateDeckInfo(data);
    } catch (error) {
      console.error('Error fetching rate deck info:', error);
      // Don't set this as a blocking error, just log it
      console.warn('Could not fetch rate deck information, continuing without it');
    }
  };

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

  const fetchRates = async (page: number = currentPage) => {
    if (!rateDeckId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const offset = (page - 1) * recordsPerPage;
      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: recordsPerPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value && value !== 'all')
        ),
      });

      const response = await fetch(`/api/rates/sms/decks/${rateDeckId}/rates?${queryParams}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // API doesn't exist yet, show empty state
          setRateData({ rates: [], total: 0 });
          setTotalRecords(0);
          setLastRefresh(new Date());
          return;
        }
        throw new Error('Failed to fetch SMS rates');
      }

      const data = await response.json();
      setRateData(data);
      setTotalRecords(data.total);
      setCurrentPage(page);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching SMS rates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch SMS rates';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchRates(1);
  };

  const clearFilters = () => {
    setFilters({
      prefix: '',
      country: '',
      minRate: '',
      maxRate: '',
    });
    setCurrentPage(1);
    fetchRates(1);
  };

  const handlePageChange = (page: number) => {
    fetchRates(page);
  };

  const handleLimitChange = (newLimit: string) => {
    setRecordsPerPage(parseInt(newLimit));
    setCurrentPage(1);
    fetchRates(1);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const exportToCsv = () => {
    if (!rateData?.rates || rateData.rates.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Prefix', 'Country', 'Description', 'Rate', 'Effective Date'];
    const csvContent = [
      headers.join(','),
      ...rateData.rates.map(rate => [
        rate.prefix,
        `"${rate.country}"`,
        `"${rate.description}"`,
        rate.rate.toFixed(4),
        rate.effectiveDate,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sms-rates-${rateDeckId}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingRate 
        ? `/api/rates/sms/decks/${rateDeckId}/rates/${editingRate.id}`
        : `/api/rates/sms/decks/${rateDeckId}/rates`;
      
      const method = editingRate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          rate: parseFloat(formData.rate),
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`API endpoint not implemented yet. Please implement ${method} ${url} to manage individual SMS rates.`);
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to ${editingRate ? 'update' : 'create'} SMS rate`);
      }

      toast.success(`SMS rate ${editingRate ? 'updated' : 'created'} successfully`);
      setIsFormOpen(false);
      setEditingRate(null);
      setFormData({
        prefix: '',
        country: '',
        description: '',
        rate: '',
        effectiveDate: new Date().toISOString().split('T')[0],
      });
      fetchRates();
    } catch (error) {
      console.error('Error saving SMS rate:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save SMS rate';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (rate: SmsRate) => {
    setEditingRate(rate);
    setFormData({
      prefix: rate.prefix,
      country: rate.country,
      description: rate.description,
      rate: rate.rate.toString(),
      effectiveDate: rate.effectiveDate,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (rate: SmsRate) => {
    setRateToDelete(rate);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!rateToDelete) return;
    
    try {
      const response = await fetch(`/api/rates/sms/decks/${rateDeckId}/rates/${rateToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`API endpoint not implemented yet. Please implement DELETE /api/rates/sms/decks/{deckId}/rates/{id} to delete individual SMS rates.`);
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete SMS rate');
      }

      toast.success('SMS rate deleted successfully');
      setDeleteDialogOpen(false);
      setRateToDelete(null);
      fetchRates();
    } catch (error) {
      console.error('Error deleting SMS rate:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete SMS rate';
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    fetchRateDeckInfo();
    fetchCountries();
    fetchRates(1);
  }, [rateDeckId]);

  // Calculate pagination
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  if (error && !rateData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">{t('rates.common.states.error')}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchRates()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center gap-4">
        <Link href="/rates?tab=sms">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Rate Decks
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-semibold">
            {rateDeckInfo ? rateDeckInfo.name : `SMS Rate Deck ${rateDeckId}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {rateDeckInfo ? rateDeckInfo.description : 'Manage individual SMS rates within this rate deck'}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rates</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rate</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgRate, rateDeckInfo?.currency)}</p>
              </div>
              <Phone className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Countries</p>
                <p className="text-2xl font-bold">{stats.uniqueCountries}</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rate Range</p>
                <p className="text-lg font-bold">
                  {formatCurrency(stats.minRate, rateDeckInfo?.currency)} - {formatCurrency(stats.maxRate, rateDeckInfo?.currency)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Min - Max</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
            >
              <MessageSquare className="h-4 w-4" />
              SMS Rates
            </div>
          </div>
          <p className="text-muted-foreground">
            {stats.total} rate{stats.total !== 1 ? 's' : ''} in this deck
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
            onClick={() => fetchRates()}
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
            disabled={!rateData?.rates || rateData.rates.length === 0}
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
                  Add Rate
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleFormSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRate ? 'Edit SMS Rate' : 'Add SMS Rate'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingRate ? 'Update the rate details.' : 'Add a new SMS rate to this deck.'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prefix">Prefix *</Label>
                        <Input
                          id="prefix"
                          value={formData.prefix}
                          onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
                          placeholder="e.g., 1, 44, 49"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <Select
                          value={formData.country}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country._id} value={country.name}>
                                {country.name} (+{country.phoneCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g., Mobile networks"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rate">Rate ({rateDeckInfo?.currency || 'USD'}) *</Label>
                        <Input
                          id="rate"
                          type="number"
                          step="0.0001"
                          min="0"
                          value={formData.rate}
                          onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                          placeholder="0.0150"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="effectiveDate">Effective Date *</Label>
                        <Input
                          id="effectiveDate"
                          type="date"
                          value={formData.effectiveDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" style={{ backgroundColor: colors.primary }}>
                      {editingRate ? 'Update Rate' : 'Add Rate'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Prefix</Label>
                <Input
                  value={filters.prefix}
                  onChange={(e) => handleFilterChange('prefix', e.target.value)}
                  placeholder="Filter by prefix"
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  placeholder="Filter by country"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Rate</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={filters.minRate}
                  onChange={(e) => handleFilterChange('minRate', e.target.value)}
                  placeholder="0.0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Rate</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={filters.maxRate}
                  onChange={(e) => handleFilterChange('maxRate', e.target.value)}
                  placeholder="1.0000"
                />
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

      {/* Rates Table */}
      {isLoading && !rateData ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>{t('rates.common.states.loading')}</span>
            </div>
          </CardContent>
        </Card>
      ) : !rateData?.rates || rateData.rates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Rates Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {error ? 
                'The rate management API is not yet implemented. Individual rate management will be available once the backend APIs are created.' :
                'This rate deck doesn\'t have any rates yet. Add your first rate to get started.'
              }
            </p>
            {isAdmin && !error && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button style={{ backgroundColor: colors.primary }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Rate
                  </Button>
                </DialogTrigger>
              </Dialog>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-5 w-5" style={{ color: colors.primary }} />
                SMS Rates
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {startRecord}-{endRecord} of {totalRecords} rates
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Effective Date</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateData?.rates.map((rate) => (
                    <TableRow key={rate.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono">{rate.prefix}</TableCell>
                      <TableCell>{rate.country}</TableCell>
                      <TableCell>{rate.description || '-'}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(rate.rate, rateDeckInfo?.currency)}
                      </TableCell>
                      <TableCell>{format(new Date(rate.effectiveDate), 'MMM dd, yyyy')}</TableCell>
                      
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(rate)}
                              className="h-8 w-8 p-0"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(rate)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
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
                  Showing {startRecord}-{endRecord} of {totalRecords} rates
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rates per page:</span>
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
                      <SelectItem value="200">200</SelectItem>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SMS Rate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the rate for prefix "{rateToDelete?.prefix}" ({rateToDelete?.country})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 