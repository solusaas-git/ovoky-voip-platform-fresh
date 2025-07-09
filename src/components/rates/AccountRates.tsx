'use client';

/*
 * AccountRates Component - Color Usage Philosophy:
 * 
 * - Brand colors (colors.primary, colors.secondary, colors.accent): Used for icons, backgrounds, and accents
 * - Theme-aware text colors (.text-brand): Used for main stat values for readability
 * - Tailwind semantic colors (.text-muted-foreground): Used for secondary text
 * 
 * This ensures brand identity is maintained while text remains readable in both light and dark modes.
 */

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge'; // Unused
import { 
  Loader2, 
  RefreshCw, 
  Download,
  DollarSign,
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Info,
  TrendingUp,
  MapPin,
  // ChevronDown, // Unused
  // ChevronUp, // Unused
  Phone,
  Eye
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
  // DialogDescription, // Unused
  DialogHeader,
  DialogTitle,
  // DialogTrigger, // Unused
} from '@/components/ui/dialog';
import React from 'react';

// Function to get country flag emoji based on country name
const getCountryFlag = (countryName: string): string => {
  const countryFlags: Record<string, string> = {
    'United States': '🇺🇸',
    'USA': '🇺🇸',
    'US': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'UK': '🇬🇧',
    'Great Britain': '🇬🇧',
    'Canada': '🇨🇦',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
    'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪',
    'Switzerland': '🇨🇭',
    'Austria': '🇦🇹',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Finland': '🇫🇮',
    'Poland': '🇵🇱',
    'Czech Republic': '🇨🇿',
    'Hungary': '🇭🇺',
    'Romania': '🇷🇴',
    'Bulgaria': '🇧🇬',
    'Greece': '🇬🇷',
    'Portugal': '🇵🇹',
    'Ireland': '🇮🇪',
    'Luxembourg': '🇱🇺',
    'Slovenia': '🇸🇮',
    'Slovakia': '🇸🇰',
    'Croatia': '🇭🇷',
    'Estonia': '🇪🇪',
    'Latvia': '🇱🇻',
    'Lithuania': '🇱🇹',
    'Malta': '🇲🇹',
    'Cyprus': '🇨🇾',
    'Australia': '🇦🇺',
    'New Zealand': '🇳🇿',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'China': '🇨🇳',
    'India': '🇮🇳',
    'Brazil': '🇧🇷',
    'Mexico': '🇲🇽',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Colombia': '🇨🇴',
    'Peru': '🇵🇪',
    'Venezuela': '🇻🇪',
    'South Africa': '🇿🇦',
    'Egypt': '🇪🇬',
    'Nigeria': '🇳🇬',
    'Kenya': '🇰🇪',
    'Morocco': '🇲🇦',
    'Israel': '🇮🇱',
    'Turkey': '🇹🇷',
    'Russia': '🇷🇺',
    'Ukraine': '🇺🇦',
    'Belarus': '🇧🇾',
    'Kazakhstan': '🇰🇿',
    'Thailand': '🇹🇭',
    'Vietnam': '🇻🇳',
    'Singapore': '🇸🇬',
    'Malaysia': '🇲🇾',
    'Indonesia': '🇮🇩',
    'Philippines': '🇵🇭',
    'Hong Kong': '🇭🇰',
    'Taiwan': '🇹🇼',
    'Macau': '🇲🇴',
    'Saudi Arabia': '🇸🇦',
    'United Arab Emirates': '🇦🇪',
    'UAE': '🇦🇪',
    'Qatar': '🇶🇦',
    'Kuwait': '🇰🇼',
    'Bahrain': '🇧🇭',
    'Oman': '🇴🇲',
    'Jordan': '🇯🇴',
    'Lebanon': '🇱🇧',
    'Syria': '🇸🇾',
    'Iraq': '🇮🇶',
    'Iran': '🇮🇷',
    'Pakistan': '🇵🇰',
    'Bangladesh': '🇧🇩',
    'Sri Lanka': '🇱🇰',
    'Nepal': '🇳🇵',
    'Afghanistan': '🇦🇫',
    'Myanmar': '🇲🇲',
    'Cambodia': '🇰🇭',
    'Laos': '🇱🇦',
    'Mongolia': '🇲🇳',
    'North Korea': '🇰🇵',
  };

  // Try exact match first
  if (countryFlags[countryName]) {
    return countryFlags[countryName];
  }

  // Try case-insensitive match
  const lowerCountryName = countryName.toLowerCase();
  for (const [key, flag] of Object.entries(countryFlags)) {
    if (key.toLowerCase() === lowerCountryName) {
      return flag;
    }
  }

  // Try partial match for common variations
  for (const [key, flag] of Object.entries(countryFlags)) {
    if (key.toLowerCase().includes(lowerCountryName) || lowerCountryName.includes(key.toLowerCase())) {
      return flag;
    }
  }

  // Default to globe emoji if no flag found
  return '🌍';
};

interface Rate {
  prefix: string;
  country: string;
  description: string;
  rate: number;
  local_rate: number;
}

interface RatesData {
  result: string;
  currency: string;
  rates: Rate[];
  count: number;
  requestDuration?: number;
}

interface CountryGroup {
  country: string;
  flag: string;
  rates: Rate[];
  avgRate: number;
  minRate: number;
  maxRate: number;
  totalPrefixes: number;
}

interface RatesStats {
  total: number;
  avgRate: number;
  minRate: number;
  maxRate: number;
  uniqueCountries: number;
  currency: string;
}

interface AccountRatesProps {
  accountId?: number;
}

export function AccountRates({ accountId }: AccountRatesProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { colors } = useBranding();
  const { t } = useTranslations();
  // const { company, getGradientStyle, features } = useBranding(); // Unused
  const [ratesData, setRatesData] = useState<RatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'country' | 'table'>('country');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(200); // Increased for better country grouping
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    prefix: '',
    country: '',
  });

  // Country dialog state
  const [selectedCountry, setSelectedCountry] = useState<CountryGroup | null>(null);
  const [isCountryDialogOpen, setIsCountryDialogOpen] = useState(false);

  // Use provided accountId or user's account ID
  const targetAccountId = accountId || user?.sippyAccountId;

  // Group rates by country
  const groupRatesByCountry = (rates: Rate[]): CountryGroup[] => {
    const countryMap = new Map<string, Rate[]>();
    
    rates.forEach(rate => {
      const country = rate.country || 'Unknown';
      if (!countryMap.has(country)) {
        countryMap.set(country, []);
      }
      countryMap.get(country)!.push(rate);
    });

    const countryGroups: CountryGroup[] = [];
    
    countryMap.forEach((countryRates, country) => {
      const rateValues = countryRates.map(r => r.rate).filter(r => r > 0);
      const minRate = rateValues.length > 0 ? Math.min(...rateValues) : 0;
      const maxRate = rateValues.length > 0 ? Math.max(...rateValues) : 0;
      
      countryGroups.push({
        country,
        flag: getCountryFlag(country),
        rates: countryRates.sort((a, b) => a.prefix.localeCompare(b.prefix)),
        avgRate: 0, // Not useful for mobile/landline rates
        minRate,
        maxRate,
        totalPrefixes: countryRates.length
      });
    });

    // Sort countries by name
    return countryGroups.sort((a, b) => a.country.localeCompare(b.country));
  };

  // Calculate rates statistics
  const calculateStats = (rates: Rate[], currency: string): RatesStats => {
    const stats: RatesStats = {
      total: rates.length,
      avgRate: 0, // Not useful for mobile/landline rates
      minRate: 0,
      maxRate: 0,
      uniqueCountries: 0,
      currency
    };

    if (rates.length === 0) return stats;

    const rateValues = rates.map(r => r.rate).filter(r => r > 0);
    const countries = new Set(rates.map(r => r.country).filter(c => c));

    if (rateValues.length > 0) {
      stats.minRate = Math.min(...rateValues);
      stats.maxRate = Math.max(...rateValues);
    }

    stats.uniqueCountries = countries.size;

    return stats;
  };

  const stats = ratesData && Array.isArray(ratesData.rates) ? calculateStats(ratesData.rates, ratesData.currency) : {
    total: 0,
    avgRate: 0,
    minRate: 0,
    maxRate: 0,
    uniqueCountries: 0,
    currency: ''
  };

  const countryGroups = ratesData && Array.isArray(ratesData.rates) ? groupRatesByCountry(ratesData.rates) : [];

  // Check if any rates have local rates
  const hasLocalRates = ratesData && Array.isArray(ratesData.rates) ? ratesData.rates.some(rate => rate.local_rate > 0) : false;

  const fetchRates = async (page: number = currentPage, customRecordsPerPage?: number) => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      return;
    }
    
    if (!targetAccountId) {
      setError(t('rates.callRates.errors.noRatesFound'));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const limit = customRecordsPerPage || recordsPerPage;
      const offset = (page - 1) * limit;

      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
        ...(filters.prefix && { prefix: filters.prefix }),
      });

      console.log('Fetching rates with params:', { limit, offset, page, customRecordsPerPage, recordsPerPage });
      
      const response = await fetch(`/api/sippy/account/${targetAccountId}/rates?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || t('rates.callRates.errors.fetchFailed'));
      }

      const data: RatesData = await response.json();
      console.log('Rates API response:', { rateCount: data.rates?.length, currency: data.currency });
      
      setRatesData(data);
      setLastRefresh(new Date());
      
      // Update total records for pagination
      const currentRecords = data.rates?.length || 0;
      const effectiveLimit = customRecordsPerPage || recordsPerPage;
      
      if (currentRecords === effectiveLimit) {
        // If we got a full page, there might be more records
        setTotalRecords((page + 10) * effectiveLimit);
      } else {
        // If we got less than a full page, this is the last page
        setTotalRecords(offset + currentRecords);
      }
    } catch (err) {
      console.error('Error fetching rates:', err);
      
      let errorMessage = t('rates.callRates.errors.fetchFailed');
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
    });
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchRates(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchRates(newPage);
  };

  const handleLimitChange = (value: string) => {
    const newLimit = parseInt(value);
    setRecordsPerPage(newLimit);
    setCurrentPage(1);
    fetchRates(1, newLimit);
  };

  const formatCurrency = (amount: number, currency: string = '') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const exportToCsv = () => {
    if (!ratesData?.rates || !Array.isArray(ratesData.rates)) return;

    const headers = [
      t('rates.callRates.table.headers.country'),
      t('rates.callRates.table.headers.prefix'),
      t('rates.callRates.table.headers.description'),
      t('rates.callRates.table.headers.rate'),
      t('rates.callRates.table.headers.localRate'),
      t('rates.callRates.stats.currency')
    ];

    const csvContent = [
      headers.join(','),
      ...ratesData.rates.map(rate => [
        rate.country || '',
        rate.prefix || '',
        rate.description || '',
        rate.rate || '',
        rate.local_rate || '',
        ratesData.currency || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', t('rates.callRates.export.filename', { date: format(new Date(), 'yyyy-MM-dd') }));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unused functions - commented out to fix ESLint warnings
  // const toggleCountryExpansion = (country: string) => {
  //   setSelectedCountry(countryGroups.find(group => group.country === country) || null);
  //   setIsCountryDialogOpen(true);
  // };

  // const expandAllCountries = () => {
  //   setSelectedCountry(null);
  //   setIsCountryDialogOpen(true);
  // };

  // const collapseAllCountries = () => {
  //   setSelectedCountry(null);
  //   setIsCountryDialogOpen(false);
  // };

  useEffect(() => {
    // Fetch rates when we have a target account ID (auth handled by page)
    if (targetAccountId) {
      fetchRates(1);
    }
  }, [targetAccountId]);

  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  // Function to open country dialog
  const openCountryDialog = (country: CountryGroup) => {
    setSelectedCountry(country);
    setIsCountryDialogOpen(true);
  };

  // CountryRatesDialog component
  const CountryRatesDialog = () => (
    <Dialog open={isCountryDialogOpen} onOpenChange={setIsCountryDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {selectedCountry && (
              <>
                <span className="text-2xl">{selectedCountry.flag}</span>
                <div>
                  <span style={{ color: colors.primary }}>{selectedCountry.country}</span>
                  <p className="text-sm text-muted-foreground font-normal">
                    {selectedCountry.totalPrefixes} prefix{selectedCountry.totalPrefixes !== 1 ? 'es' : ''} • 
                    {formatCurrency(selectedCountry.minRate, stats.currency)} - {formatCurrency(selectedCountry.maxRate, stats.currency)}
                  </p>
                </div>
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto">
          {selectedCountry && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  {selectedCountry.rates.some(r => r.local_rate > 0) && (
                    <TableHead className="text-right">Local Rate</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCountry.rates.map((rate, index) => (
                  <TableRow key={`${rate.prefix}-${index}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white bg-gray-600 dark:bg-gray-500"
                        >
                          +
                        </div>
                        <span className="font-mono font-semibold">
                          {rate.prefix || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{rate.description || 'No description'}</TableCell>
                    <TableCell className="text-right">
                      <span 
                        className="font-semibold"
                        style={{ color: colors.secondary }}
                      >
                        {formatCurrency(rate.rate, stats.currency)}
                      </span>
                    </TableCell>
                    {selectedCountry.rates.some(r => r.local_rate > 0) && (
                      <TableCell className="text-right">
                        {rate.local_rate > 0 ? (
                          <span className="font-semibold">
                            {formatCurrency(rate.local_rate, stats.currency)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Show loading state while fetching rates (auth already handled by page)
  if (isLoading && !ratesData) {
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
            <p className="text-muted-foreground">
              {t('rates.callRates.description')}
            </p>
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
              <Phone className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-destructive">{t('rates.common.states.error')}</CardTitle>
              <CardDescription>{t('rates.callRates.errors.fetchFailed')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => fetchRates()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('rates.common.actions.refresh')}
          </Button>
        </CardContent>
      </Card>
    );
  }

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
              <Phone className="h-4 w-4" />
              {t('rates.callRates.title')}
            </div>
          </div>
          <p className="text-muted-foreground">
            {stats.total} {t('rates.callRates.stats.totalRates')} • {stats.uniqueCountries} {t('rates.callRates.stats.uniqueCountries')}
            {lastRefresh && (
              <span className="ml-2">
                • {t('rates.common.states.lastRefresh')} {format(lastRefresh, 'HH:mm:ss')}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === 'country' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('country')}
              className="h-8 px-3"
              style={viewMode === 'country' ? { backgroundColor: colors.primary } : {}}
            >
              {t('rates.callRates.viewModes.countries')}
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
              style={viewMode === 'table' ? { backgroundColor: colors.primary } : {}}
            >
              {t('rates.callRates.viewModes.table')}
            </Button>
          </div>
          
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
            disabled={!ratesData?.rates || ratesData.rates.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('rates.common.actions.export')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rates */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('rates.callRates.stats.totalRates')}</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.total}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.uniqueCountries} {t('rates.callRates.stats.uniqueCountries')}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <Phone className="h-6 w-6" style={{ color: colors.primary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cheapest Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('rates.callRates.stats.lowestRate')}</p>
                <p className="text-2xl font-bold text-brand">
                  {formatCurrency(stats.minRate, stats.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  per minute
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.accent}20` }}
              >
                <TrendingUp className="h-6 w-6" style={{ color: colors.accent }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Most Expensive Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('rates.callRates.stats.highestRate')}</p>
                <p className="text-2xl font-bold text-brand">
                  {formatCurrency(stats.maxRate, stats.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  per minute
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.secondary}20` }}
              >
                <DollarSign className="h-6 w-6" style={{ color: colors.secondary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency & Local Rates */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('rates.callRates.stats.currency')}</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.currency || 'USD'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasLocalRates ? 'Local rates available' : 'Standard rates only'}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <MapPin className="h-6 w-6" style={{ color: colors.primary }} />
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
                {t('rates.common.filters.title')}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('rates.common.filters.prefix')}</Label>
                <Input
                  value={filters.prefix}
                  onChange={(e) => handleFilterChange('prefix', e.target.value)}
                  placeholder="Filter by prefix (e.g., 1, 44, 49)"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('rates.common.filters.country')}</Label>
                <Input
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  placeholder="Filter by country"
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
                    {t('rates.common.actions.applyFilters')}
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
                {t('rates.common.actions.clearFilters')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {stats.total === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div 
                className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
              >
                <Phone className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                  No Rates Found
                </h3>
                <p className="text-muted-foreground">
                  No rates found for account {targetAccountId}. Try adjusting your filters.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'country' ? (
        /* Country View */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
              >
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.primary }}>
                  Rates by Country
                </h2>
                <p className="text-sm text-muted-foreground">
                  Click on any country card to view detailed rates
                </p>
              </div>
            </div>
          </div>

          {/* Country Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {countryGroups.map((group) => (
              <Card 
                key={group.country}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 overflow-hidden group"
                onClick={() => openCountryDialog(group)}
              >
                <div 
                  className="h-1"
                  style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }}
                />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
                        style={{ 
                          background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                          border: `1px solid ${colors.primary}20`
                        }}
                      >
                        <span className="text-2xl">{group.flag}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate" style={{ color: colors.primary }}>
                          {group.country}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Destination country
                        </p>
                      </div>
                    </div>
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${colors.accent}20` }}
                    >
                      <Eye className="h-4 w-4" style={{ color: colors.accent }} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Prefixes */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Prefixes</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white bg-gray-600 dark:bg-gray-500"
                        >
                          {group.totalPrefixes}
                        </div>
                        <span className="text-sm font-medium">
                          {group.totalPrefixes} available
                        </span>
                      </div>
                    </div>

                    {/* Rate Range */}
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Rate Range</span>
                      <div className="flex items-center justify-between">
                        <div>
                          <div 
                            className="font-bold text-lg"
                            style={{ color: colors.secondary }}
                          >
                            {formatCurrency(group.minRate, stats.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Cheapest
                          </div>
                        </div>
                        <div className="text-muted-foreground">-</div>
                        <div className="text-right">
                          <div 
                            className="font-bold text-lg"
                            style={{ color: colors.secondary }}
                          >
                            {formatCurrency(group.maxRate, stats.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Most expensive
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Local Rates Indicator */}
                    {group.rates.some(r => r.local_rate > 0) && (
                      <div className="flex items-center gap-2 pt-2 border-t border-muted/30">
                        <div 
                          className="w-2 h-2 rounded-full bg-gray-600 dark:bg-gray-500"
                        />
                        <span className="text-xs text-muted-foreground">
                          Local rates available
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
              >
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.primary }}>
                  All Rates Table
                </h2>
                <p className="text-sm text-muted-foreground">
                  Complete list of all available rates with detailed information
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium" style={{ color: colors.secondary }}>
                Showing {startRecord}-{endRecord} of {totalRecords}
              </div>
              <div className="text-xs text-muted-foreground">
                Total rates available
              </div>
            </div>
          </div>

          {/* Enhanced Table */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <div 
              className="h-2"
              style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})` }}
            />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-0">
                      <TableHead 
                        className="bg-muted/40 font-bold text-foreground border-r border-muted/50 py-4"
                        style={{ color: colors.primary }}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Country
                        </div>
                      </TableHead>
                      <TableHead 
                        className="bg-muted/40 font-bold text-foreground border-r border-muted/50 py-4"
                        style={{ color: colors.primary }}
                      >
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Prefix
                        </div>
                      </TableHead>
                      <TableHead 
                        className="bg-muted/40 font-bold text-foreground border-r border-muted/50 py-4"
                        style={{ color: colors.primary }}
                      >
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Description
                        </div>
                      </TableHead>
                      <TableHead 
                        className="bg-muted/40 font-bold text-foreground border-r border-muted/50 py-4"
                        style={{ color: colors.primary }}
                      >
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Rate
                        </div>
                      </TableHead>
                      {hasLocalRates && (
                        <TableHead 
                          className="bg-muted/40 font-bold text-foreground py-4"
                          style={{ color: colors.primary }}
                        >
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Local Rate
                          </div>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratesData?.rates.map((rate, index) => (
                      <TableRow 
                        key={`${rate.prefix}-${index}`} 
                        className="hover:bg-muted/30 transition-all duration-200 border-b border-muted/30 group"
                      >
                        <TableCell className="border-r border-muted/30 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
                              style={{ 
                                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                                border: `1px solid ${colors.primary}20`
                              }}
                            >
                              <span className="text-xl">{getCountryFlag(rate.country)}</span>
                            </div>
                            <div>
                              <div className="font-semibold text-sm" style={{ color: colors.primary }}>
                                {rate.country || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Destination
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-muted/30 py-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm bg-gray-600 dark:bg-gray-500"
                            >
                              +
                            </div>
                            <div>
                              <div className="font-mono font-bold text-lg">
                                {rate.prefix || 'N/A'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Dialing code
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-muted/30 py-4">
                          <div className="max-w-xs">
                            <div className="font-medium text-sm leading-relaxed">
                              {rate.description || 'No description available'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className={`py-4 ${hasLocalRates ? 'border-r border-muted/30' : ''}`}>
                          <div className="text-right">
                            <div className="font-bold text-lg text-brand">
                              {formatCurrency(rate.rate, ratesData?.currency)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              per minute
                            </div>
                          </div>
                        </TableCell>
                        {hasLocalRates && (
                          <TableCell className="py-4">
                            <div className="text-right">
                              {rate.local_rate > 0 ? (
                                <>
                                  <div className="font-semibold text-lg text-foreground">
                                    {formatCurrency(rate.local_rate, ratesData?.currency)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    local rate
                                  </div>
                                </>
                              ) : (
                                <div className="text-center">
                                  <div className="text-muted-foreground italic text-sm">
                                    No local rate
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    available
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            
            {/* Enhanced Pagination */}
            <div 
              className="border-t bg-muted/20 px-6 py-4"
              style={{ borderColor: `${colors.primary}20` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${colors.primary}20` }}
                    >
                      <Info className="h-4 w-4" style={{ color: colors.primary }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {startRecord}-{endRecord} of {totalRecords}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Rates displayed
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Rows:</span>
                    <Select
                      value={recordsPerPage.toString()}
                      onValueChange={handleLimitChange}
                    >
                      <SelectTrigger 
                        className="w-[80px] h-9 border-0 shadow-md"
                        style={{ backgroundColor: `${colors.primary}10` }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium" style={{ color: colors.secondary }}>
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                      className="h-9 w-9 p-0 shadow-md hover:shadow-lg transition-all"
                      style={{ 
                        borderColor: colors.primary,
                        color: colors.primary
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoading}
                      className="h-9 w-9 p-0 shadow-md hover:shadow-lg transition-all"
                      style={{ 
                        borderColor: colors.primary,
                        color: colors.primary
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Country Rates Dialog */}
      <CountryRatesDialog />
    </div>
  );
} 