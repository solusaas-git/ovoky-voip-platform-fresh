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
import { 
  Loader2, 
  RefreshCw, 
  Download,
  MessageSquare,
  Globe,
  Filter,
  ChevronLeft,
  ChevronRight
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

interface SmsRate {
  id: string;
  prefix: string;
  country: string;
  description: string;
  rate: number;
  type: 'Geographic/Local' | 'Mobile' | 'National' | 'Toll-free' | 'Shared Cost' | 'NPV (Verified Numbers)';
  effectiveDate: string;
  rateDeckName: string;
  rateDeckId: string;
  currency: string;
}

interface UserSmsRatesData {
  rates: SmsRate[];
  total: number;
  rateDecks: Array<{
    id: string;
    name: string;
    currency: string;
  }>;
}

interface SmsRateStats {
  total: number;
  avgRate: number;
  minRate: number;
  maxRate: number;
  uniqueCountries: number;
  byType: Record<string, number>;
  byRateDeck: Record<string, number>;
}

export function UserSmsRates() {
  const { t } = useTranslations();
  const { colors } = useBranding();
  // const { company, getGradientStyle, features } = useBranding(); // Unused
  const [rateData, setRateData] = useState<UserSmsRatesData | null>(null);
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
    type: 'all',
    rateDeck: 'all',
    minRate: '',
    maxRate: '',
  });

  // Calculate rates statistics
  const calculateStats = (rates: SmsRate[]): SmsRateStats => {
    const stats: SmsRateStats = {
      total: rates.length,
      avgRate: 0,
      minRate: 0,
      maxRate: 0,
      uniqueCountries: 0,
      byType: {},
      byRateDeck: {},
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

    // Count by type
    rates.forEach(rate => {
      stats.byType[rate.type] = (stats.byType[rate.type] || 0) + 1;
      stats.byRateDeck[rate.rateDeckName] = (stats.byRateDeck[rate.rateDeckName] || 0) + 1;
    });

    return stats;
  };

  const stats = rateData ? calculateStats(rateData.rates) : {
    total: 0,
    avgRate: 0,
    minRate: 0,
    maxRate: 0,
    uniqueCountries: 0,
    byType: {},
    byRateDeck: {},
  };

  const fetchUserRates = async (page: number = currentPage) => {
    try {
      setIsLoading(true);
      setError(null);

      const limit = recordsPerPage;
      const offset = (page - 1) * limit;

      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
        ...(filters.prefix && { prefix: filters.prefix }),
        ...(filters.country && { country: filters.country }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.rateDeck !== 'all' && { rateDeckId: filters.rateDeck }),
        ...(filters.minRate && { minRate: filters.minRate }),
        ...(filters.maxRate && { maxRate: filters.maxRate }),
      });

      const response = await fetch(`/api/rates/sms/user-rates?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch your SMS rates`);
      }

      const data: UserSmsRatesData = await response.json();
      console.log('User SMS rates API response:', { rateCount: data.rates?.length });
      
      setRateData(data);
      setTotalRecords(data.total || data.rates?.length || 0);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching user SMS rates:', err);
      
      let errorMessage = 'Failed to fetch your SMS rates';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      prefix: '',
      country: '',
      type: 'all',
      rateDeck: 'all',
      minRate: '',
      maxRate: '',
    });
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchUserRates(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchUserRates(newPage);
  };

  const handleLimitChange = (value: string) => {
    const newLimit = parseInt(value);
    setRecordsPerPage(newLimit);
    setCurrentPage(1);
    fetchUserRates(1);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const exportToCsv = () => {
    if (!rateData?.rates) return;

    const headers = [
      'Prefix',
      'Country',
      'Description',
      'Rate',
      'Currency',
      'Type',
      'Rate Deck',
      'Effective Date'
    ];

    const csvContent = [
      headers.join(','),
      ...rateData.rates.map(rate => [
        rate.prefix || '',
        rate.country || '',
        rate.description || '',
        rate.rate || '',
        rate.currency || '',
        rate.type || '',
        rate.rateDeckName || '',
        rate.effectiveDate ? format(new Date(rate.effectiveDate), 'yyyy-MM-dd') : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `my_sms_rates_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchUserRates(1);
  }, []);

  if (isLoading && !rateData) {
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
            <p className="text-muted-foreground">Fetching your assigned SMS rates...</p>
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
            <CardDescription>{t('rates.common.states.errorDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => fetchUserRates()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!rateData || rateData.rates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <MessageSquare className="h-5 w-5" style={{ color: colors.primary }} />
            </div>
            <div>
              <CardTitle>{t('rates.smsRates.userRates.noAssignment')}</CardTitle>
              <CardDescription>{t('rates.smsRates.userRates.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t('rates.smsRates.userRates.description')}
          </p>
          <Button 
            variant="outline" 
            onClick={() => fetchUserRates()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('rates.common.actions.refresh')}
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
              {t('rates.smsRates.userRates.title')}
            </div>
          </div>
          <p className="text-muted-foreground">
            {stats.total} {t('rates.callRates.stats.totalRates')} • {stats.uniqueCountries} {t('rates.callRates.stats.uniqueCountries')} • Avg: {formatCurrency(stats.avgRate)}
            {lastRefresh && (
              <span className="ml-2">
                • {t('rates.common.states.lastRefresh')} {format(lastRefresh, 'HH:mm:ss')}
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
            {t('rates.common.filters.title')}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchUserRates()}
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
            {t('rates.common.actions.export')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('rates.smsRates.stats.totalRates')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('rates.callRates.stats.uniqueCountries')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueCountries}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('rates.callRates.stats.averageRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgRate)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rate Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div>Min: {formatCurrency(stats.minRate)}</div>
              <div>Max: {formatCurrency(stats.maxRate)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Prefix</label>
                <Input
                  placeholder="e.g., 1, 44, 33"
                  value={filters.prefix}
                  onChange={(e) => handleFilterChange('prefix', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Input
                  placeholder="e.g., United States, UK"
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => handleFilterChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Geographic/Local">Geographic/Local</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="Toll-free">Toll-free</SelectItem>
                    <SelectItem value="Shared Cost">Shared Cost</SelectItem>
                    <SelectItem value="NPV (Verified Numbers)">NPV (Verified Numbers)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Rate Deck</label>
                <Select
                  value={filters.rateDeck}
                  onValueChange={(value) => handleFilterChange('rateDeck', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rate Decks</SelectItem>
                    {rateData?.rateDecks.map((deck) => (
                      <SelectItem key={deck.id} value={deck.id}>
                        {deck.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Rate</label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  value={filters.minRate}
                  onChange={(e) => handleFilterChange('minRate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Rate</label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="1.0000"
                  value={filters.maxRate}
                  onChange={(e) => handleFilterChange('maxRate', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={applyFilters} size="sm">
                {t('rates.common.actions.applyFilters')}
              </Button>
              <Button variant="outline" onClick={clearFilters} size="sm">
                {t('rates.common.actions.clearAll')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('rates.smsRates.userRates.title')}</CardTitle>
          <CardDescription>
            {t('rates.smsRates.userRates.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('rates.callRates.table.headers.prefix')}</TableHead>
                  <TableHead>{t('rates.callRates.table.headers.country')}</TableHead>
                  <TableHead>{t('rates.callRates.table.headers.description')}</TableHead>
                  <TableHead>{t('rates.callRates.table.headers.rate')}</TableHead>
                  <TableHead>{t('rates.callRates.table.headers.type')}</TableHead>
                  <TableHead>{t('rates.callRates.table.headers.rateDeck')}</TableHead>
                  <TableHead>{t('rates.callRates.table.headers.effectiveDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateData?.rates.map((rate) => (
                  <TableRow key={rate.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="font-mono font-medium">
                        {rate.prefix}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{rate.country}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {rate.description || 'No description'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-mono font-medium">
                        {formatCurrency(rate.rate, rate.currency)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">
                        {rate.type}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{rate.rateDeckName}</div>
                        <div className="text-muted-foreground">{rate.currency}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {rate.effectiveDate ? format(new Date(rate.effectiveDate), 'MMM dd, yyyy') : 'N/A'}
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
    </div>
  );
} 