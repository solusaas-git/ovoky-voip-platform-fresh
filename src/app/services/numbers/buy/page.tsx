'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Hash,
  Search,
  X,
  Loader2,
  ShoppingCart,
  CheckCircle,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Package,
  Trash2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency, maskPhoneNumber } from '@/lib/utils';
import { PhoneNumber } from '@/types/phoneNumber';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/lib/i18n';

interface AvailableNumbersResponse {
  phoneNumbers: PhoneNumber[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    countries: string[];
    numberTypes: string[];
  };
}

interface BulkPurchaseResult {
  successful: Array<{
    phoneNumberId: string;
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee: number;
    currency: string;
    billingCycle: string;
    rateDeckName?: string;
  }>;
  failed: Array<{
    phoneNumberId: string;
    error: string;
    number: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalCost: number;
    totalSetupFees: number;
  };
}

export default function BuyNumbersPage() {
  const { t } = useTranslations();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [filters, setFilters] = useState({
    countries: [] as string[],
    numberTypes: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Selection states for bulk operations
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  
  // Modal states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showBulkPurchaseModal, setShowBulkPurchaseModal] = useState(false);
  const [showBulkResultModal, setShowBulkResultModal] = useState(false);
  const [showBackorderModal, setShowBackorderModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isBulkPurchasing, setIsBulkPurchasing] = useState(false);
  const [isSubmittingBackorder, setIsSubmittingBackorder] = useState(false);
  const [bulkPurchaseResult, setBulkPurchaseResult] = useState<BulkPurchaseResult | null>(null);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [numberTypeFilter, setNumberTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('monthlyRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Backorder form state
  const [backorderForm, setBackorderForm] = useState({
    reason: '',
    businessJustification: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  const limit = 12;

  useEffect(() => {
    fetchAvailableNumbers();
  }, [currentPage, searchTerm, countryFilter, numberTypeFilter, sortBy, sortOrder]);

  // Reset selections when phone numbers change
  useEffect(() => {
    setSelectedNumbers(new Set());
    setIsSelectAll(false);
  }, [phoneNumbers]);

  const fetchAvailableNumbers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (countryFilter !== 'all') params.append('country', countryFilter);
      if (numberTypeFilter !== 'all') params.append('numberType', numberTypeFilter);

      const response = await fetch(`/api/phone-numbers/available?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available numbers');
      }
      
      const data: AvailableNumbersResponse = await response.json();
      console.log('API Response data:', data);
      console.log('Phone numbers:', data.phoneNumbers?.map(p => ({ 
        number: p.number, 
        monthlyRate: p.monthlyRate, 
        setupFee: p.setupFee 
      })));
      
      setPhoneNumbers(data.phoneNumbers || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      setFilters(data.filters || { countries: [], numberTypes: [] });
    } catch (error) {
      console.error('Error fetching available numbers:', error);
      toast.error(t('phoneNumbers.buyNumbers.messages.error.loadNumbers'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSinglePurchase = async () => {
    if (!selectedNumber) return;

    try {
      setIsPurchasing(true);
      const response = await fetch('/api/phone-numbers/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: selectedNumber._id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to purchase number');
      }

      toast.success(t('phoneNumbers.buyNumbers.messages.success.numberPurchased', { number: selectedNumber.number }));
      setShowPurchaseModal(false);
      setSelectedNumber(null);
      fetchAvailableNumbers(); // Refresh the list
    } catch (error) {
      console.error('Error purchasing number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.buyNumbers.messages.error.purchaseNumber'));
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleBulkPurchase = async () => {
    if (selectedNumbers.size === 0) return;

    try {
      setIsBulkPurchasing(true);
      const phoneNumberIds = Array.from(selectedNumbers);
      
      const response = await fetch('/api/phone-numbers/purchase/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberIds,
        }),
      });

      const result: BulkPurchaseResult = await response.json();
      
      setBulkPurchaseResult(result);
      setShowBulkPurchaseModal(false);
      setShowBulkResultModal(true);
      
      // Clear selections
      setSelectedNumbers(new Set());
      setIsSelectAll(false);
      
      // Refresh the list after bulk purchase
      fetchAvailableNumbers();
      
    } catch (error) {
      console.error('Error bulk purchasing numbers:', error);
      toast.error(t('phoneNumbers.buyNumbers.messages.error.bulkPurchase'));
    } finally {
      setIsBulkPurchasing(false);
    }
  };

  const handleBackorderRequest = async () => {
    if (!selectedNumber) return;

    try {
      setIsSubmittingBackorder(true);
      const response = await fetch('/api/backorder-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: selectedNumber._id,
          reason: backorderForm.reason,
          businessJustification: backorderForm.businessJustification,
          priority: backorderForm.priority,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit backorder request');
      }

      const result = await response.json();
      toast.success(t('phoneNumbers.buyNumbers.messages.success.backorderSubmitted', { requestId: result.request.requestNumber }));
      setShowBackorderModal(false);
      setSelectedNumber(null);
      setBackorderForm({
        reason: '',
        businessJustification: '',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error submitting backorder request:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.buyNumbers.messages.error.submitBackorder'));
    } finally {
      setIsSubmittingBackorder(false);
    }
  };

  const handleSelectNumber = (numberId: string, checked: boolean) => {
    // Find the number to check if it's backorder-only
    const number = phoneNumbers.find(n => n._id === numberId);
    if (number?.backorderOnly) {
      toast.warning('Backorder-only numbers cannot be selected for bulk purchase. Please submit individual backorder requests.');
      return;
    }
    
    const newSelected = new Set(selectedNumbers);
    if (checked) {
      if (newSelected.size >= 20) {
        toast.warning('You can only select up to 20 numbers for bulk purchase.');
        return;
      }
      newSelected.add(numberId);
    } else {
      newSelected.delete(numberId);
    }
    setSelectedNumbers(newSelected);
    
    // Update select all state
    const availableForBulk = phoneNumbers.filter(n => !n.backorderOnly);
    setIsSelectAll(newSelected.size === availableForBulk.length && availableForBulk.length > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select numbers that are not backorder-only
      const availableForBulk = phoneNumbers.filter(n => !n.backorderOnly);
      const limitedSelection = availableForBulk.slice(0, 20);
      const allIds = new Set(limitedSelection.map(number => number._id));
      setSelectedNumbers(allIds);
      setIsSelectAll(limitedSelection.length === availableForBulk.length);
      
      if (availableForBulk.length > 20) {
        toast.info(`Selected first 20 of ${availableForBulk.length} available numbers.`);
      }
    } else {
      setSelectedNumbers(new Set());
      setIsSelectAll(false);
    }
  };

  const getSelectedNumbers = () => {
    return phoneNumbers.filter(n => selectedNumbers.has(n._id));
  };

  const getTotalCost = () => {
    const selected = getSelectedNumbers();
    const monthlyTotal = selected.reduce((sum, n) => sum + (n.monthlyRate || 0), 0);
    const setupTotal = selected.reduce((sum, n) => sum + (n.setupFee || 0), 0);
    return { monthlyTotal, setupTotal };
  };

  const changePage = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCountryFilter('all');
    setNumberTypeFilter('all');
    setSortBy('monthlyRate');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  return (
    <MainLayout>
      <PageLayout
        title={t('phoneNumbers.buyNumbers.page.title')}
        description={t('phoneNumbers.buyNumbers.page.description')}
        breadcrumbs={[
          { label: t('phoneNumbers.buyNumbers.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('phoneNumbers.buyNumbers.page.breadcrumbs.services'), href: '/services' },
          { label: t('phoneNumbers.buyNumbers.page.breadcrumbs.numbers'), href: '/services/numbers' },
          { label: t('phoneNumbers.buyNumbers.page.breadcrumbs.buyNumbers') }
        ]}
      >
        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('phoneNumbers.buyNumbers.filters.title')}</CardTitle>
              {phoneNumbers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={isSelectAll}
                    onCheckedChange={handleSelectAll}
                    className="mr-2"
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium">
                    {t('phoneNumbers.buyNumbers.filters.selectAll', { 
                      count: Math.min(phoneNumbers.filter(n => !n.backorderOnly).length, 20).toString(),
                      maxText: phoneNumbers.filter(n => !n.backorderOnly).length > 20 ? t('phoneNumbers.buyNumbers.filters.maxText', { total: phoneNumbers.filter(n => !n.backorderOnly).length.toString() }) : ''
                    })}
                  </Label>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t('phoneNumbers.buyNumbers.filters.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.buyNumbers.filters.allCountries')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('phoneNumbers.buyNumbers.filters.allCountries')}</SelectItem>
                  {filters.countries.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={numberTypeFilter} onValueChange={setNumberTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.buyNumbers.filters.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('phoneNumbers.buyNumbers.filters.allTypes')}</SelectItem>
                  {filters.numberTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={`${sortBy}_${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('_');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.buyNumbers.filters.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthlyRate_asc">{t('phoneNumbers.buyNumbers.filters.sortOptions.priceLowHigh')}</SelectItem>
                  <SelectItem value="monthlyRate_desc">{t('phoneNumbers.buyNumbers.filters.sortOptions.priceHighLow')}</SelectItem>
                  <SelectItem value="country_asc">{t('phoneNumbers.buyNumbers.filters.sortOptions.countryAZ')}</SelectItem>
                  <SelectItem value="country_desc">{t('phoneNumbers.buyNumbers.filters.sortOptions.countryZA')}</SelectItem>
                  <SelectItem value="number_asc">{t('phoneNumbers.buyNumbers.filters.sortOptions.numberAZ')}</SelectItem>
                  <SelectItem value="number_desc">{t('phoneNumbers.buyNumbers.filters.sortOptions.numberZA')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(searchTerm || countryFilter !== 'all' || numberTypeFilter !== 'all' || sortBy !== 'monthlyRate' || sortOrder !== 'asc') && (
              <Button variant="ghost" onClick={clearFilters} className="mt-2">
                <X className="h-4 w-4 mr-2" />
                {t('phoneNumbers.buyNumbers.filters.clearFilters')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{total}</div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.stats.totalNumbers')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {phoneNumbers.filter(n => !n.backorderOnly).length}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.stats.directPurchase')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {phoneNumbers.filter(n => n.backorderOnly).length}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.stats.backorderOnly')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{filters.countries.length}</div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.stats.countries')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {phoneNumbers.length > 0 ? formatCurrency(Math.min(...phoneNumbers.map(n => n.monthlyRate || 0)), phoneNumbers[0]?.currency || 'USD') : '-'}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.stats.startingFrom')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Numbers Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : phoneNumbers.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('phoneNumbers.buyNumbers.numbers.empty.title')}</h3>
                <p className="text-muted-foreground">
                  {searchTerm || countryFilter !== 'all' || numberTypeFilter !== 'all' 
                    ? t('phoneNumbers.buyNumbers.numbers.empty.descriptionFiltered')
                    : t('phoneNumbers.buyNumbers.numbers.empty.descriptionEmpty')
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {phoneNumbers.map((number) => (
                <Card key={number._id} className={`hover:shadow-lg transition-shadow ${selectedNumbers.has(number._id) ? 'ring-2 ring-green-500 bg-green-50/50 dark:bg-green-950/30 dark:ring-green-400' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={selectedNumbers.has(number._id)}
                        onCheckedChange={(checked) => handleSelectNumber(number._id, !!checked)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        disabled={number.backorderOnly}
                      />
                      <CardTitle className="text-lg font-mono flex-1 min-w-0">{maskPhoneNumber(number.number)}</CardTitle>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-muted-foreground">
                        {number.country} • {number.numberType}
                      </div>
                      {number.backorderOnly ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs whitespace-nowrap">
                          {t('phoneNumbers.buyNumbers.numbers.badges.backorder')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 text-xs whitespace-nowrap">
                          {t('phoneNumbers.buyNumbers.numbers.badges.available')}
                        </Badge>
                      )}
                    </div>
                    
                    <CardDescription className="text-xs text-muted-foreground">
                      {number.backorderOnly 
                        ? t('phoneNumbers.buyNumbers.numbers.descriptions.backorderRequired')
                        : t('phoneNumbers.buyNumbers.numbers.descriptions.fullNumberAfterPurchase')
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.numbers.fields.monthlyRate')}</Label>
                        <p className="font-medium text-lg text-green-600">
                          {formatCurrency(number.monthlyRate || 0, number.currency)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.numbers.fields.setupFee')}</Label>
                        <p className="font-medium">
                          {number.setupFee ? formatCurrency(number.setupFee, number.currency) : t('phoneNumbers.buyNumbers.modals.singlePurchase.fields.free')}
                        </p>
                      </div>
                    </div>

                    {number.capabilities && number.capabilities.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.numbers.fields.capabilities')}</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {number.capabilities.map((capability) => (
                            <Badge key={capability} variant="secondary" className="text-xs">
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {number.backorderOnly ? (
                      <Button
                        onClick={() => {
                          setSelectedNumber(number);
                          setShowBackorderModal(true);
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {t('phoneNumbers.buyNumbers.numbers.buttons.requestBackorder')}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedNumber(number);
                          setShowPurchaseModal(true);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={selectedNumbers.has(number._id)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {selectedNumbers.has(number._id) ? t('phoneNumbers.buyNumbers.numbers.buttons.selectedForBulk') : t('phoneNumbers.buyNumbers.numbers.buttons.purchaseNumber')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  {t('phoneNumbers.buyNumbers.pagination.showing', { 
                    start: (((currentPage - 1) * limit) + 1).toString(),
                    end: Math.min(currentPage * limit, total).toString(),
                    total: total.toString()
                  })}
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t('phoneNumbers.buyNumbers.pagination.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    {t('phoneNumbers.buyNumbers.pagination.next')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Floating Bulk Actions Panel */}
        {selectedNumbers.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="shadow-xl border-2 border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-950/90">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      {selectedNumbers.size === 1 ? t('phoneNumbers.buyNumbers.bulkActions.selected', { count: selectedNumbers.size.toString() }) : t('phoneNumbers.buyNumbers.bulkActions.selectedPlural', { count: selectedNumbers.size.toString() })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      {t('phoneNumbers.buyNumbers.bulkActions.monthly', { amount: formatCurrency(getTotalCost().monthlyTotal, phoneNumbers[0]?.currency || 'USD') })}
                      {getTotalCost().setupTotal > 0 && (
                        t('phoneNumbers.buyNumbers.bulkActions.setup', { amount: formatCurrency(getTotalCost().setupTotal, phoneNumbers[0]?.currency || 'USD') })
                      )}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedNumbers(new Set());
                        setIsSelectAll(false);
                      }}
                      className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-900/50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('phoneNumbers.buyNumbers.bulkActions.clear')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowBulkPurchaseModal(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Package className="h-4 w-4 mr-1" />
                      {selectedNumbers.size === 1 ? t('phoneNumbers.buyNumbers.bulkActions.purchase', { count: selectedNumbers.size.toString() }) : t('phoneNumbers.buyNumbers.bulkActions.purchasePlural', { count: selectedNumbers.size.toString() })}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Purchase Confirmation Modal */}
        <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.buyNumbers.modals.singlePurchase.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.buyNumbers.modals.singlePurchase.description', { number: maskPhoneNumber(selectedNumber?.number || '') })}
              </DialogDescription>
            </DialogHeader>
            {selectedNumber && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>{t('phoneNumbers.buyNumbers.modals.singlePurchase.fields.phoneNumber')}</Label>
                    <p className="font-mono text-lg">{maskPhoneNumber(selectedNumber.number)}</p>
                    <p className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.modals.singlePurchase.fields.fullNumberNote')}</p>
                  </div>
                  <div>
                    <Label>{t('phoneNumbers.buyNumbers.modals.singlePurchase.fields.country')}</Label>
                    <p>{selectedNumber.country}</p>
                  </div>
                  <div>
                    <Label>{t('phoneNumbers.buyNumbers.modals.singlePurchase.fields.type')}</Label>
                    <p>{selectedNumber.numberType}</p>
                  </div>
                  <div>
                    <Label>{t('phoneNumbers.buyNumbers.modals.singlePurchase.fields.monthlyRate')}</Label>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(selectedNumber.monthlyRate || 0, selectedNumber.currency)}
                    </p>
                  </div>
                  <div>
                    <Label>{t('phoneNumbers.buyNumbers.modals.singlePurchase.fields.setupFee')}</Label>
                    <p className="font-semibold">
                      {selectedNumber.setupFee && selectedNumber.setupFee > 0 
                        ? formatCurrency(selectedNumber.setupFee, selectedNumber.currency)
                        : t('phoneNumbers.buyNumbers.modals.singlePurchase.fields.free')
                      }
                    </p>
                  </div>
                </div>

                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('phoneNumbers.buyNumbers.modals.singlePurchase.alerts.billingStarts', { 
                      date: formatDate(new Date()),
                      cycle: selectedNumber.billingCycle === 'yearly' ? t('phoneNumbers.buyNumbers.modals.singlePurchase.alerts.yearly') : t('phoneNumbers.buyNumbers.modals.singlePurchase.alerts.monthly')
                    })}</strong>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('phoneNumbers.buyNumbers.modals.singlePurchase.alerts.termsAgreement')}
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowPurchaseModal(false)}>
                {t('phoneNumbers.buyNumbers.modals.singlePurchase.buttons.cancel')}
              </Button>
              <Button
                onClick={handleSinglePurchase}
                disabled={isPurchasing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.buyNumbers.modals.singlePurchase.buttons.purchasing')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('phoneNumbers.buyNumbers.modals.singlePurchase.buttons.purchase')}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Purchase Confirmation Modal */}
        <Dialog open={showBulkPurchaseModal} onOpenChange={setShowBulkPurchaseModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                {t('phoneNumbers.buyNumbers.modals.bulkPurchase.title')}
              </DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.buyNumbers.modals.bulkPurchase.description', { count: selectedNumbers.size.toString() })}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedNumbers.size}</div>
                  <div className="text-sm text-muted-foreground">{t('phoneNumbers.buyNumbers.modals.bulkPurchase.summary.totalNumbers')}</div>
                </div>
                                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(getTotalCost().monthlyTotal, phoneNumbers[0]?.currency || 'USD')}
                    </div>
                  <div className="text-sm text-muted-foreground">{t('phoneNumbers.buyNumbers.modals.bulkPurchase.summary.totalMonthly')}</div>
                </div>
                                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(getTotalCost().setupTotal, phoneNumbers[0]?.currency || 'USD')}
                    </div>
                  <div className="text-sm text-muted-foreground">{t('phoneNumbers.buyNumbers.modals.bulkPurchase.summary.totalSetup')}</div>
                </div>
                                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(getTotalCost().monthlyTotal + getTotalCost().setupTotal, phoneNumbers[0]?.currency || 'USD')}
                    </div>
                  <div className="text-sm text-muted-foreground">{t('phoneNumbers.buyNumbers.modals.bulkPurchase.summary.grandTotal')}</div>
                </div>
              </div>

              {/* Selected Numbers List */}
              <div>
                <h3 className="font-semibold mb-3">{t('phoneNumbers.buyNumbers.modals.bulkPurchase.numbersTitle')}</h3>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <div className="grid gap-2 p-4">
                    {getSelectedNumbers().map((number) => (
                      <div key={number._id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <div className="flex-1">
                          <div className="font-mono font-medium">{maskPhoneNumber(number.number)}</div>
                          <div className="text-sm text-muted-foreground">
                            {number.country} • {number.numberType}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {formatCurrency(number.monthlyRate || 0, number.currency)}/mo
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {number.setupFee && number.setupFee > 0 
                              ? `+${formatCurrency(number.setupFee, number.currency)} setup`
                              : 'Free setup'
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <strong>Billing Information:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Billing starts today ({formatDate(new Date())}) for all purchased numbers</li>
                    <li>Monthly charges will be billed on the same date each month</li>
                    <li>Setup fees (if any) are one-time charges</li>
                    <li>You can manage or cancel these numbers anytime from your dashboard</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Bulk Purchase Process:</strong> Numbers will be processed individually. 
                  If some purchases fail, you&apos;ll receive a detailed report showing which numbers 
                  were successfully purchased and which failed with reasons.
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowBulkPurchaseModal(false)}>
                {t('phoneNumbers.buyNumbers.modals.bulkPurchase.buttons.cancel')}
              </Button>
              <Button
                onClick={handleBulkPurchase}
                disabled={isBulkPurchasing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isBulkPurchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.buyNumbers.modals.bulkPurchase.buttons.purchasing')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('phoneNumbers.buyNumbers.modals.bulkPurchase.buttons.purchase')}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Purchase Results Modal */}
        <Dialog open={showBulkResultModal} onOpenChange={setShowBulkResultModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {bulkPurchaseResult?.summary.failed === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : bulkPurchaseResult?.summary.successful === 0 ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                {t('phoneNumbers.buyNumbers.modals.bulkResult.title')}
              </DialogTitle>
              <DialogDescription>
                {bulkPurchaseResult?.summary.failed === 0 
                  ? t('phoneNumbers.buyNumbers.modals.bulkResult.summary.successful', { count: bulkPurchaseResult.summary.successful.toString() })
                  : bulkPurchaseResult?.summary.successful === 0
                  ? t('phoneNumbers.buyNumbers.modals.bulkResult.summary.failed', { count: bulkPurchaseResult.summary.failed.toString() })
                  : `${t('phoneNumbers.buyNumbers.modals.bulkResult.summary.successful', { count: bulkPurchaseResult?.summary.successful.toString() || '0' })}, ${t('phoneNumbers.buyNumbers.modals.bulkResult.summary.failed', { count: bulkPurchaseResult?.summary.failed.toString() || '0' })}`
                }
              </DialogDescription>
            </DialogHeader>
            
            {bulkPurchaseResult && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{bulkPurchaseResult.summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total Attempted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{bulkPurchaseResult.summary.successful}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{bulkPurchaseResult.summary.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        bulkPurchaseResult.summary.totalCost + bulkPurchaseResult.summary.totalSetupFees, 
                        bulkPurchaseResult.successful[0]?.currency || 'USD'
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Cost</div>
                  </div>
                </div>

                {/* Successful Purchases */}
                {bulkPurchaseResult.successful.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      {t('phoneNumbers.buyNumbers.modals.bulkResult.sections.successful')} ({bulkPurchaseResult.successful.length})
                    </h3>
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      <div className="divide-y">
                        {bulkPurchaseResult.successful.map((result) => (
                          <div key={result.phoneNumberId} className="p-3 flex items-center justify-between">
                            <div>
                              <div className="font-mono font-medium">{result.number}</div>
                              <div className="text-sm text-muted-foreground">
                                {result.country} • {result.numberType}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-green-600">
                                {formatCurrency(result.monthlyRate, result.currency)}/mo
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {result.setupFee && result.setupFee > 0 
                                  ? `+${formatCurrency(result.setupFee, result.currency)} setup`
                                  : 'Free setup'
                                }
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Failed Purchases */}
                {bulkPurchaseResult.failed.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {t('phoneNumbers.buyNumbers.modals.bulkResult.sections.failed')} ({bulkPurchaseResult.failed.length})
                    </h3>
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      <div className="divide-y">
                        {bulkPurchaseResult.failed.map((result, index) => (
                          <div key={`${result.phoneNumberId}-${index}`} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="font-mono font-medium">{result.number}</div>
                              <Badge variant="destructive">Failed</Badge>
                            </div>
                            <div className="text-sm text-red-600 mt-1">{result.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {bulkPurchaseResult.successful.length > 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Next Steps:</strong> Your purchased numbers are now active and can be managed 
                      from your <a href="/services/numbers" className="text-green-600 hover:underline">Numbers Dashboard</a>. 
                      Billing records have been created and will appear in your billing section.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkResultModal(false)}
              >
                {t('phoneNumbers.buyNumbers.modals.bulkResult.buttons.close')}
              </Button>
              {bulkPurchaseResult?.successful.length && bulkPurchaseResult.successful.length > 0 && (
                <Button 
                  onClick={() => window.location.href = '/services/numbers'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  View My Numbers
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Backorder Request Modal */}
        <Dialog open={showBackorderModal} onOpenChange={setShowBackorderModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.buyNumbers.modals.backorder.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.buyNumbers.modals.backorder.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            
            {selectedNumber && (
              <div className="space-y-6">
                {/* Number Details */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.numbers.fields.phoneNumber')}</Label>
                      <p className="font-mono font-medium">{selectedNumber.number}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.numbers.fields.monthlyRate')}</Label>
                      <p className="font-medium text-green-600">
                        {formatCurrency(selectedNumber.monthlyRate || 0, selectedNumber.currency)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.numbers.fields.country')} & {t('phoneNumbers.buyNumbers.numbers.fields.type')}</Label>
                      <p>{selectedNumber.country} • {selectedNumber.numberType}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('phoneNumbers.buyNumbers.numbers.fields.setupFee')}</Label>
                      <p>{selectedNumber.setupFee ? formatCurrency(selectedNumber.setupFee, selectedNumber.currency) : t('phoneNumbers.buyNumbers.modals.singlePurchase.fields.free')}</p>
                    </div>
                  </div>
                </div>

                {/* Request Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="priority">{t('phoneNumbers.buyNumbers.modals.backorder.form.priority.label')}</Label>
                    <Select value={backorderForm.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setBackorderForm({...backorderForm, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('phoneNumbers.buyNumbers.modals.backorder.form.priority.options.low')}</SelectItem>
                        <SelectItem value="medium">{t('phoneNumbers.buyNumbers.modals.backorder.form.priority.options.medium')}</SelectItem>
                        <SelectItem value="high">{t('phoneNumbers.buyNumbers.modals.backorder.form.priority.options.high')}</SelectItem>
                        <SelectItem value="urgent">{t('phoneNumbers.buyNumbers.modals.backorder.form.priority.options.urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reason">{t('phoneNumbers.buyNumbers.modals.backorder.form.reason.label')}</Label>
                    <Input
                      id="reason"
                      value={backorderForm.reason}
                      onChange={(e) => setBackorderForm({...backorderForm, reason: e.target.value})}
                      placeholder={t('phoneNumbers.buyNumbers.modals.backorder.form.reason.placeholder')}
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {backorderForm.reason.length}/200 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="businessJustification">{t('phoneNumbers.buyNumbers.modals.backorder.form.businessJustification.label')}</Label>
                    <Textarea
                      id="businessJustification"
                      value={backorderForm.businessJustification}
                      onChange={(e) => setBackorderForm({...backorderForm, businessJustification: e.target.value})}
                      placeholder={t('phoneNumbers.buyNumbers.modals.backorder.form.businessJustification.placeholder')}
                      rows={4}
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {backorderForm.businessJustification.length}/1000 characters
                    </p>
                  </div>
                </div>

                {/* Important Information */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Backorder Process:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Your request will be reviewed by our admin team</li>
                      <li>You&apos;ll receive email notifications about status updates</li>
                      <li>If approved, the number will be automatically assigned to your account</li>
                      <li>Billing will start only after approval and assignment</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowBackorderModal(false)}>
                {t('phoneNumbers.buyNumbers.modals.backorder.buttons.cancel')}
              </Button>
              <Button
                onClick={handleBackorderRequest}
                disabled={isSubmittingBackorder || !backorderForm.reason.trim() || !backorderForm.businessJustification.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmittingBackorder ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.buyNumbers.modals.backorder.buttons.submitting')}
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('phoneNumbers.buyNumbers.modals.backorder.buttons.submit')}
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