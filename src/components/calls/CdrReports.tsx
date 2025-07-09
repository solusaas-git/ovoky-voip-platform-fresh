'use client';

/*
 * CdrReports Component - Color Usage Philosophy:
 * 
 * - Brand colors (colors.primary, colors.secondary, colors.accent): Used for icons, backgrounds, and accents
 * - Theme-aware text colors (.text-brand): Used for main stat values for readability
 * - Tailwind semantic colors (.text-muted-foreground): Used for secondary text
 * 
 * This ensures brand identity is maintained while text remains readable in both light and dark modes.
 */

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
  DollarSign,
  Activity,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  FileText,
  Globe,
  Timer,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Helper function to parse Sippy's custom date format
// Format: "22:43:01.000 GMT Thu May 22 2025"
function parseSippyDate(sippyDateString: string): Date | null {
  if (!sippyDateString) return null;
  
  try {
    // Sippy format: "HH:MM:SS.000 GMT Day Mon DD YYYY"
    // Example: "22:43:01.000 GMT Thu May 22 2025"
    const parts = sippyDateString.split(' ');
    if (parts.length < 6) return null;
    
    const time = parts[0]; // "22:43:01.000"
    // parts[1] is "GMT"
    const monthName = parts[3]; // "May"
    const day = parts[4]; // "22"
    const year = parts[5]; // "2025"
    
    // Convert month name to number
    const months: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const month = months[monthName];
    if (!month) {
      console.error('Unknown month:', monthName);
      return null;
    }
    
    // Remove milliseconds from time and create ISO string
    const timeWithoutMs = time.split('.')[0]; // "22:43:01"
    const isoString = `${year}-${month}-${day.padStart(2, '0')}T${timeWithoutMs}Z`;
    
    return new Date(isoString);
  } catch (e) {
    console.error('Error parsing Sippy date:', sippyDateString, e);
    return null;
  }
}

// Sippy result code interpretations based on official documentation
// Source: https://support.sippysoft.com/support/solutions/articles/3000107425-internal-external-result-codes-in-cdrs
function interpretSippyResultCode(result: number): { 
  type: 'success' | 'error' | 'warning'; 
  label: string; 
  description: string;
  category: string;
} {
  // Successful calls
  if (result === 0 || result === 200) {
    return {
      type: 'success',
      label: 'Success',
      description: 'Call completed successfully',
      category: 'Successful'
    };
  }

  // Internal negative error codes (Sippy-specific)
  const internalCodes: Record<number, { label: string; description: string; category: string }> = {
    [-1]: { label: 'External Translator Rejected', description: 'External Translator Rejected The Call', category: 'Translation' },
    [-2]: { label: 'Body-less INVITE', description: 'Body-less INVITE', category: 'Protocol' },
    [-3]: { label: 'Account Expired', description: 'Account Expired', category: 'Account' },
    [-4]: { label: 'Connection Capacity Exceeded', description: 'Connection Capacity Exceeded', category: 'Capacity' },
    [-5]: { label: 'Malformed SDP', description: 'Malformed SDP', category: 'Protocol' },
    [-6]: { label: 'Unsupported Content-Type', description: 'Unsupported Content-Type', category: 'Protocol' },
    [-7]: { label: 'Unacceptable Codec', description: 'Unacceptable Codec', category: 'Media' },
    [-8]: { label: 'Invalid CLD Translation (Auth)', description: 'Invalid CLD Translation Rule In The Authentication Rule', category: 'Translation' },
    [-9]: { label: 'Invalid CLI Translation (Auth)', description: 'Invalid CLI Translation Rule In The Authentication Rule', category: 'Translation' },
    [-10]: { label: 'Invalid CLD Translation (Account)', description: 'Invalid CLD Translation Rule In The Account', category: 'Translation' },
    [-11]: { label: 'Invalid CLI Translation (Account)', description: 'Invalid CLI Translation Rule In The Account', category: 'Translation' },
    [-12]: { label: 'Cannot Find Session', description: 'Cannot Find The Session To Bind To', category: 'Session' },
    [-13]: { label: 'Invalid CLI Translation (DID)', description: 'Invalid CLI Translation Rule In The DID', category: 'Translation' },
    [-14]: { label: 'No Rate Found', description: 'No Rate Found In Tariff', category: 'Billing' },
    [-15]: { label: 'Call Loop Detected', description: 'Call Loop Detected', category: 'Routing' },
    [-16]: { label: 'Too Many Sessions', description: 'Too Many Sessions', category: 'Capacity' },
    [-17]: { label: 'Account In Use', description: 'Account Is In Use', category: 'Account' },
    [-18]: { label: 'CPS Limit (Account)', description: 'Call Per Second (CPS) Limit On Account Exceeded', category: 'Rate Limiting' },
    [-19]: { label: 'CPS Limit (System)', description: 'Call Per Second (CPS) System Limit Exceeded', category: 'Rate Limiting' },
    [-20]: { label: 'Insufficient Balance', description: 'Insufficient Balance', category: 'Billing' },
    [-21]: { label: 'Forbidden Destination', description: 'Destination Is Forbidden', category: 'Routing' },
    [-22]: { label: 'No Customer Rate', description: 'No Rate Found In Customer\'s Tariff', category: 'Billing' },
    [-23]: { label: 'Loss Protection', description: 'Loss Protection', category: 'Quality' },
    [-24]: { label: 'Address Incomplete', description: 'Address Is Incomplete', category: 'Addressing' },
    [-25]: { label: 'No Routes Found', description: 'No Routes Found', category: 'Routing' },
    [-26]: { label: 'CPS Limit (Connection)', description: 'Call Per Second (CPS) Limit On Connection Exceeded', category: 'Rate Limiting' },
    [-27]: { label: 'Invalid Asserted ID', description: 'Invalid Asserted ID Translation Rule In The Account', category: 'Translation' },
    [-28]: { label: 'CLD in DNC List', description: 'CLD is in the Do Not Call List', category: 'Compliance' },
    [-29]: { label: 'Invalid CLD Translation (DID)', description: 'Invalid CLD Translation Rule In The DID', category: 'Translation' },
    [-30]: { label: 'Call Canceled', description: 'Call has been canceled by calling party', category: 'User Action' },
    [-31]: { label: 'CPS Limit (Customer)', description: 'Call Per Second (CPS) Limit On Customer Exceeded', category: 'Rate Limiting' },
    [-32]: { label: 'Too Many Sessions (Customer)', description: 'Too Many Sessions For Customer', category: 'Capacity' },
    [-33]: { label: 'CPS Limit (Auth Rule)', description: 'Call Per Second (CPS) Limit On Auth Rule Exceeded', category: 'Rate Limiting' },
    [-34]: { label: 'Too Many Sessions (Auth Rule)', description: 'Too Many Sessions For Auth Rule', category: 'Capacity' },
    [-35]: { label: 'Invalid CLI Translation (Pre-Routing)', description: 'Invalid CLI Translation Rule In The Pre-Routing Rule', category: 'Translation' },
    [-36]: { label: 'Invalid CLD Translation (Pre-Routing)', description: 'Invalid CLD Translation Rule In The Pre-Routing Rule', category: 'Translation' },
    [-37]: { label: 'CLI in DNC List', description: 'CLI is in the Do Not Call List', category: 'Compliance' }
  };

  if (internalCodes[result]) {
    return {
      type: 'error',
      label: internalCodes[result].label,
      description: internalCodes[result].description,
      category: internalCodes[result].category
    };
  }

  // Standard SIP response codes
  const sipCodes: Record<number, { label: string; description: string; category: string }> = {
    // 1xx Provisional
    100: { label: 'Trying', description: 'Trying', category: 'Provisional' },
    180: { label: 'Ringing', description: 'Ringing', category: 'Provisional' },
    181: { label: 'Call Being Forwarded', description: 'Call Is Being Forwarded', category: 'Provisional' },
    182: { label: 'Queued', description: 'Queued', category: 'Provisional' },
    183: { label: 'Session Progress', description: 'Session Progress', category: 'Provisional' },

    // 2xx Success
    200: { label: 'OK', description: 'OK', category: 'Success' },
    202: { label: 'Accepted', description: 'Accepted', category: 'Success' },

    // 3xx Redirection
    300: { label: 'Multiple Choices', description: 'Multiple Choices', category: 'Redirection' },
    301: { label: 'Moved Permanently', description: 'Moved Permanently', category: 'Redirection' },
    302: { label: 'Moved Temporarily', description: 'Moved Temporarily', category: 'Redirection' },
    305: { label: 'Use Proxy', description: 'Use Proxy', category: 'Redirection' },
    380: { label: 'Alternative Service', description: 'Alternative Service', category: 'Redirection' },

    // 4xx Client Error
    400: { label: 'Bad Request', description: 'Bad Request - Malformed SDP or Unsupported Content-Type', category: 'Client Error' },
    401: { label: 'Unauthorized', description: 'Unauthorized', category: 'Client Error' },
    402: { label: 'Payment Required', description: 'Payment Required', category: 'Client Error' },
    403: { label: 'Forbidden', description: 'Forbidden - Auth Failed, Insufficient Balance, or Account Issues', category: 'Client Error' },
    404: { label: 'Not Found', description: 'Not Found', category: 'Client Error' },
    405: { label: 'Method Not Allowed', description: 'Method Not Allowed', category: 'Client Error' },
    406: { label: 'Not Acceptable', description: 'Not Acceptable', category: 'Client Error' },
    407: { label: 'Proxy Auth Required', description: 'Proxy Authentication Required', category: 'Client Error' },
    408: { label: 'Request Timeout', description: 'Request Timeout', category: 'Client Error' },
    410: { label: 'Gone', description: 'Gone', category: 'Client Error' },
    413: { label: 'Request Entity Too Large', description: 'Request Entity Too Large', category: 'Client Error' },
    414: { label: 'Request-URI Too Long', description: 'Request-URI Too Long', category: 'Client Error' },
    415: { label: 'Unsupported Media Type', description: 'Unsupported Media Type', category: 'Client Error' },
    416: { label: 'Unsupported URI Scheme', description: 'Unsupported URI Scheme', category: 'Client Error' },
    420: { label: 'Bad Extension', description: 'Bad Extension', category: 'Client Error' },
    421: { label: 'Extension Required', description: 'Extension Required', category: 'Client Error' },
    423: { label: 'Interval Too Brief', description: 'Interval Too Brief', category: 'Client Error' },
    480: { label: 'Temporarily Unavailable', description: 'Temporarily Unavailable', category: 'Client Error' },
    481: { label: 'Call/Transaction Does Not Exist', description: 'Call/Transaction Does Not Exist', category: 'Client Error' },
    482: { label: 'Loop Detected', description: 'Loop Detected', category: 'Client Error' },
    483: { label: 'Too Many Hops', description: 'Too Many Hops', category: 'Client Error' },
    484: { label: 'Address Incomplete', description: 'Address Incomplete', category: 'Client Error' },
    485: { label: 'Ambiguous', description: 'Ambiguous', category: 'Client Error' },
    486: { label: 'Busy Here', description: 'Busy Here', category: 'Client Error' },
    487: { label: 'Request Terminated', description: 'Request Terminated', category: 'Client Error' },
    488: { label: 'Not Acceptable Here', description: 'Not Acceptable Here - Codec incompatibility', category: 'Client Error' },
    491: { label: 'Request Pending', description: 'Request Pending', category: 'Client Error' },
    493: { label: 'Undecipherable', description: 'Undecipherable', category: 'Client Error' },

    // 5xx Server Error
    500: { label: 'Server Internal Error', description: 'Internal Server Error', category: 'Server Error' },
    501: { label: 'Not Implemented', description: 'Not Implemented', category: 'Server Error' },
    502: { label: 'Bad Gateway', description: 'Bad Gateway', category: 'Server Error' },
    503: { label: 'Service Unavailable', description: 'Service Unavailable - Call rate too high or capacity exceeded', category: 'Server Error' },
    504: { label: 'Server Time-out', description: 'Server Time-out', category: 'Server Error' },
    505: { label: 'Version Not Supported', description: 'Version Not Supported', category: 'Server Error' },
    513: { label: 'Message Too Large', description: 'Message Too Large', category: 'Server Error' },

    // 6xx Global Failure
    600: { label: 'Busy Everywhere', description: 'Busy Everywhere', category: 'Global Failure' },
    603: { label: 'Decline', description: 'Decline', category: 'Global Failure' },
    604: { label: 'Does Not Exist Anywhere', description: 'Does Not Exist Anywhere', category: 'Global Failure' },
    606: { label: 'Not Acceptable', description: 'Not Acceptable', category: 'Global Failure' }
  };

  if (sipCodes[result]) {
    const isError = result >= 400;
    return {
      type: isError ? 'error' : 'warning',
      label: sipCodes[result].label,
      description: sipCodes[result].description,
      category: sipCodes[result].category
    };
  }

  // Unknown result code
  return {
    type: 'error',
    label: `Unknown (${result})`,
    description: `Unknown result code: ${result}`,
    category: 'Unknown'
  };
}

interface Cdr {
  i_account: number;
  connect_time: string;
  billed_duration: number;
  plan_duration: number;
  cli: string;
  cld: string;
  cli_in: string;
  cld_in: string;
  cost: string;
  payment_currency: string;
  country: string;
  description: string;
  remote_ip: string;
  result: number;
  protocol: string;
  accessibility_cost: number;
  grace_period: number;
  post_call_surcharge: number;
  connect_fee: number;
  free_seconds: number;
  duration: number;
  interval_1: number;
  interval_n: number;
  price_1: number;
  price_n: number;
  delay: number;
  pdd1xx: number;
  i_call: string;
  call_id: string;
  i_cdr: string;
  prefix: string;
  lrn_cld: string;
  lrn_cld_in: string;
  p_asserted_id: string;
  remote_party_id: string;
  release_source: string;
  user_agent: string;
  area_name: string;
}

interface CdrStats {
  total: number;
  totalCost: number;
  avgDuration: number;
  avgCost: number;
  completedCalls: number;
  errorCalls: number;
  totalMinutes: number;
}

interface CdrReportsProps {
  accountId?: number;
}

export function CdrReports({ accountId }: CdrReportsProps) {
  const { user } = useAuth();
  const { colors, getGradientStyle, features } = useBranding();
  const { t } = useTranslations();
  const [cdrs, setCdrs] = useState<Cdr[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: 'non_zero_and_errors',
    start_date: '',
    end_date: '',
    cli: '',
    cld: '',
    result_type: 'all', // New filter for result types
  });
  
  // Use provided accountId or user's account ID
  const targetAccountId = accountId || user?.sippyAccountId;

  // Filter CDRs by result type (client-side filtering)
  const filterCdrsByResultType = (cdrs: Cdr[]): Cdr[] => {
    if (!filters.result_type || filters.result_type === 'all') return cdrs;

    return cdrs.filter(cdr => {
      const interpretation = interpretSippyResultCode(cdr.result);
      
      switch (filters.result_type) {
        case 'success':
          return interpretation.type === 'success';
        case 'billing':
          return interpretation.category === 'Billing';
        case 'rate_limiting':
          return interpretation.category === 'Rate Limiting';
        case 'translation':
          return interpretation.category === 'Translation';
        case 'capacity':
          return interpretation.category === 'Capacity';
        case 'routing':
          return interpretation.category === 'Routing';
        case 'protocol':
          return interpretation.category === 'Protocol';
        case 'account':
          return interpretation.category === 'Account';
        case 'compliance':
          return interpretation.category === 'Compliance';
        case 'client_error':
          return cdr.result >= 400 && cdr.result < 500;
        case 'server_error':
          return cdr.result >= 500 && cdr.result < 600;
        default:
          return true;
      }
    });
  };

  // Apply result type filtering
  const filteredCdrs = filterCdrsByResultType(cdrs);

  // Calculate CDR statistics
  const calculateStats = (cdrs: Cdr[]): CdrStats => {
    const stats: CdrStats = {
      total: cdrs.length,
      totalCost: 0,
      avgDuration: 0,
      avgCost: 0,
      completedCalls: 0,
      errorCalls: 0,
      totalMinutes: 0
    };

    if (cdrs.length === 0) return stats;

    let totalDuration = 0;
    let totalCost = 0;

    cdrs.forEach(cdr => {
      const cost = parseFloat(cdr.cost) || 0;
      const duration = cdr.duration || 0;
      
      totalCost += cost;
      totalDuration += duration;
      
      // Count completed vs error calls based on result
      if (cdr.result === 0 || cdr.result === 200) {
        stats.completedCalls++;
      } else {
        stats.errorCalls++;
      }
    });

    stats.totalCost = totalCost;
    stats.avgDuration = totalDuration / cdrs.length;
    stats.avgCost = totalCost / cdrs.length;
    stats.totalMinutes = totalDuration / 60;

    return stats;
  };

  const stats = calculateStats(filteredCdrs);

  const fetchCdrs = async (page: number = currentPage, customRecordsPerPage?: number) => {
    if (!targetAccountId) {
      setError('No account ID available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let queryFilters = { ...filters };
      const limit = customRecordsPerPage || recordsPerPage;
      const offset = (page - 1) * limit;

      // If no date filters are provided, set default to last 7 days
      // This prevents Sippy API from only returning last hour's CDRs
      if (!queryFilters.start_date && !queryFilters.end_date) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        
        queryFilters = {
          ...queryFilters,
          start_date: sevenDaysAgo.toISOString().slice(0, 16),
          end_date: now.toISOString().slice(0, 16)
        };
      }

      const queryParams = new URLSearchParams({
        ...queryFilters,
        limit: limit.toString(),
        offset: offset.toString(),
        mode: 'full' // Use full parsing for CDR Reports to get all fields
      });

      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const apiUrl = `/api/sippy/account/${targetAccountId}/cdrs?${queryParams}`;
      console.log('Fetching CDRs with params:', { limit, offset, page, customRecordsPerPage, recordsPerPage, mode: 'full' });
      console.log('Full API URL:', apiUrl);
      console.log('Query params object:', Object.fromEntries(queryParams.entries()));
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch CDRs`);
      }

      const data = await response.json();
      console.log('CDR API response:', { recordCount: data.cdrs?.length, limit, offset });
      console.log('First few CDRs:', data.cdrs?.slice(0, 3));
      setCdrs(data.cdrs || []);
      setLastRefresh(new Date());
      
      // Update total records for pagination
      const currentRecords = data.cdrs?.length || 0;
      const effectiveLimit = customRecordsPerPage || recordsPerPage;
      
      if (currentRecords === effectiveLimit) {
        // If we got a full page, there might be more records
        // Set a high estimate to enable "Next" button
        setTotalRecords((page + 10) * effectiveLimit);
      } else {
        // If we got less than a full page, this is the last page
        setTotalRecords(offset + currentRecords);
      }
    } catch (err) {
      console.error('Error fetching CDRs:', err);
      
      let errorMessage = 'Failed to fetch CDRs';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = err.message;
        }
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
      type: 'non_zero_and_errors',
      start_date: '',
      end_date: '',
      cli: '',
      cld: '',
      result_type: 'all',
    });
    setCurrentPage(1);
    setRecordsPerPage(20);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchCdrs(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchCdrs(newPage);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatCurrency = (amount: number, currency: string = '') => {
    return `${amount.toFixed(4)} ${currency}`.trim();
  };

  const getCallResultBadge = (result: number) => {
    const interpretation = interpretSippyResultCode(result);
    
    // Get translated label and description
    const getTranslatedLabel = (result: number): string => {
      // Handle success cases
      if (result === 0 || result === 200) {
        return t('cdrs.resultLabels.success');
      }
      
      // Handle internal negative codes
      const internalCodeMap: Record<number, string> = {
        [-1]: 'externalTranslatorRejected',
        [-2]: 'bodylessInvite',
        [-3]: 'accountExpired',
        [-4]: 'connectionCapacityExceeded',
        [-5]: 'malformedSdp',
        [-6]: 'unsupportedContentType',
        [-7]: 'unacceptableCodec',
        [-8]: 'invalidCldTranslationAuth',
        [-9]: 'invalidCliTranslationAuth',
        [-10]: 'invalidCldTranslationAccount',
        [-11]: 'invalidCliTranslationAccount',
        [-12]: 'cannotFindSession',
        [-13]: 'invalidCliTranslationDid',
        [-14]: 'noRateFound',
        [-15]: 'callLoopDetected',
        [-16]: 'tooManySessions',
        [-17]: 'accountInUse',
        [-18]: 'cpsLimitAccount',
        [-19]: 'cpsLimitSystem',
        [-20]: 'insufficientBalance',
        [-21]: 'forbiddenDestination',
        [-22]: 'noCustomerRate',
        [-23]: 'lossProtection',
        [-24]: 'addressIncomplete',
        [-25]: 'noRoutesFound',
        [-26]: 'cpsLimitConnection',
        [-27]: 'invalidAssertedId',
        [-28]: 'cldInDncList',
        [-29]: 'invalidCldTranslationDid',
        [-30]: 'callCanceled',
        [-31]: 'cpsLimitCustomer',
        [-32]: 'tooManySessionsCustomer',
        [-33]: 'cpsLimitAuthRule',
        [-34]: 'tooManySessionsAuthRule',
        [-35]: 'invalidCliTranslationPreRouting',
        [-36]: 'invalidCldTranslationPreRouting',
        [-37]: 'cliInDncList'
      };
      
      if (internalCodeMap[result]) {
        return t(`cdrs.resultLabels.${internalCodeMap[result]}`);
      }
      
      // Handle standard SIP codes
      const sipCodeMap: Record<number, string> = {
        100: 'trying',
        180: 'ringing',
        181: 'callBeingForwarded',
        182: 'queued',
        183: 'sessionProgress',
        200: 'ok',
        202: 'accepted',
        300: 'multipleChoices',
        301: 'movedPermanently',
        302: 'movedTemporarily',
        305: 'useProxy',
        380: 'alternativeService',
        404: 'numberNotFound',
        486: 'busyHere'
      };
      
      if (sipCodeMap[result]) {
        return t(`cdrs.resultLabels.${sipCodeMap[result]}`);
      }
      
      // For other SIP codes, use the original label
      return interpretation.label;
    };

    const getTranslatedDescription = (result: number): string => {
      // Handle success cases
      if (result === 0 || result === 200) {
        return t('cdrs.resultDescriptions.success');
      }
      
      // Handle internal negative codes
      const internalCodeMap: Record<number, string> = {
        [-1]: 'externalTranslatorRejected',
        [-2]: 'bodylessInvite',
        [-3]: 'accountExpired',
        [-4]: 'connectionCapacityExceeded',
        [-5]: 'malformedSdp',
        [-6]: 'unsupportedContentType',
        [-7]: 'unacceptableCodec',
        [-8]: 'invalidCldTranslationAuth',
        [-9]: 'invalidCliTranslationAuth',
        [-10]: 'invalidCldTranslationAccount',
        [-11]: 'invalidCliTranslationAccount',
        [-12]: 'cannotFindSession',
        [-13]: 'invalidCliTranslationDid',
        [-14]: 'noRateFound',
        [-15]: 'callLoopDetected',
        [-16]: 'tooManySessions',
        [-17]: 'accountInUse',
        [-18]: 'cpsLimitAccount',
        [-19]: 'cpsLimitSystem',
        [-20]: 'insufficientBalance',
        [-21]: 'forbiddenDestination',
        [-22]: 'noCustomerRate',
        [-23]: 'lossProtection',
        [-24]: 'addressIncomplete',
        [-25]: 'noRoutesFound',
        [-26]: 'cpsLimitConnection',
        [-27]: 'invalidAssertedId',
        [-28]: 'cldInDncList',
        [-29]: 'invalidCldTranslationDid',
        [-30]: 'callCanceled',
        [-31]: 'cpsLimitCustomer',
        [-32]: 'tooManySessionsCustomer',
        [-33]: 'cpsLimitAuthRule',
        [-34]: 'tooManySessionsAuthRule',
        [-35]: 'invalidCliTranslationPreRouting',
        [-36]: 'invalidCldTranslationPreRouting',
        [-37]: 'cliInDncList'
      };
      
      if (internalCodeMap[result]) {
        return t(`cdrs.resultDescriptions.${internalCodeMap[result]}`);
      }
      
      // Handle standard SIP codes
      const sipCodeMap: Record<number, string> = {
        100: 'trying',
        180: 'ringing',
        181: 'callBeingForwarded',
        182: 'queued',
        183: 'sessionProgress',
        200: 'ok',
        202: 'accepted',
        300: 'multipleChoices',
        301: 'movedPermanently',
        302: 'movedTemporarily',
        305: 'useProxy',
        380: 'alternativeService',
        404: 'numberNotFound',
        486: 'busyHere'
      };
      
      if (sipCodeMap[result]) {
        return t(`cdrs.resultDescriptions.${sipCodeMap[result]}`);
      }
      
      // For other codes, use the original description
      return interpretation.description;
    };

    const getTranslatedCategory = (result: number): string => {
      const categoryMap: Record<string, string> = {
        'Successful': 'successful',
        'Translation': 'translation',
        'Protocol': 'protocol',
        'Account': 'account',
        'Capacity': 'capacity',
        'Media': 'media',
        'Session': 'session',
        'Billing': 'billing',
        'Routing': 'routing',
        'Rate Limiting': 'rateLimiting',
        'Quality': 'quality',
        'Addressing': 'addressing',
        'Compliance': 'compliance',
        'User Action': 'userAction',
        'Provisional': 'provisional',
        'Success': 'success',
        'Redirection': 'redirection',
        'Client Error': 'clientError',
        'Server Error': 'serverError',
        'Global Failure': 'globalFailure'
      };
      
      if (categoryMap[interpretation.category]) {
        return t(`cdrs.categories.${categoryMap[interpretation.category]}`);
      }
      
      return interpretation.category;
    };

    const translatedLabel = getTranslatedLabel(result);
    const translatedDescription = getTranslatedDescription(result);
    const translatedCategory = getTranslatedCategory(result);
    
    const getIcon = () => {
      switch (interpretation.type) {
        case 'success':
          return <CheckCircle className="h-3 w-3" />;
        case 'warning':
          return <AlertTriangle className="h-3 w-3" />;
        case 'error':
          return <XCircle className="h-3 w-3" />;
        default:
          return <Info className="h-3 w-3" />;
      }
    };

    const getBadgeClasses = () => {
      switch (interpretation.type) {
        case 'success':
          return 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100 dark:text-green-400 dark:bg-green-950 dark:border-green-800 dark:hover:bg-green-900';
        case 'warning':
          return 'text-yellow-700 bg-yellow-50 border-yellow-200 hover:bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800 dark:hover:bg-yellow-900';
        case 'error':
          return 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100 dark:text-red-400 dark:bg-red-950 dark:border-red-800 dark:hover:bg-red-900';
        default:
          return 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800 dark:hover:bg-gray-900';
      }
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`text-xs cursor-help transition-colors ${getBadgeClasses()}`}
            title={`${translatedLabel}: ${translatedDescription} (Code: ${result})`}
          >
            <div className="flex items-center gap-1">
              {getIcon()}
              <span>{translatedLabel}</span>
              <span className="text-xs opacity-60">({result})</span>
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{translatedLabel}</div>
            <div className="text-sm text-muted-foreground">{translatedDescription}</div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="text-xs">
                {translatedCategory}
              </Badge>
              <span className="text-muted-foreground">Code: {result}</span>
            </div>
            {interpretation.type === 'error' && interpretation.category === 'Billing' && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800">
                💡 <strong>{t('cdrs.tooltips.tip')}</strong> {t('cdrs.tooltips.billing')}
              </div>
            )}
            {interpretation.type === 'error' && interpretation.category === 'Rate Limiting' && (
              <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 p-2 rounded dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800">
                💡 <strong>{t('cdrs.tooltips.tip')}</strong> {t('cdrs.tooltips.rateLimiting')}
              </div>
            )}
            {interpretation.type === 'error' && interpretation.category === 'Translation' && (
              <div className="text-xs text-purple-600 bg-purple-50 border border-purple-200 p-2 rounded dark:text-purple-400 dark:bg-purple-950 dark:border-purple-800">
                💡 <strong>{t('cdrs.tooltips.tip')}</strong> {t('cdrs.tooltips.translation')}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  const exportToCsv = () => {
    const headers = [
      t('cdrs.export.csvHeaders.callId'),
      t('cdrs.export.csvHeaders.connectTime'),
      t('cdrs.export.csvHeaders.duration'),
      t('cdrs.export.csvHeaders.billedDuration'),
      t('cdrs.export.csvHeaders.cli'),
      t('cdrs.export.csvHeaders.cld'),
      t('cdrs.export.csvHeaders.cost'),
      t('cdrs.export.csvHeaders.country'),
      t('cdrs.export.csvHeaders.description'),
      t('cdrs.export.csvHeaders.result'),
      t('cdrs.export.csvHeaders.protocol'),
      t('cdrs.export.csvHeaders.remoteIp')
    ];

    const csvContent = [
      headers.join(','),
      ...filteredCdrs.map(cdr => [
        cdr.i_call || cdr.call_id || '',
        cdr.connect_time || '',
        cdr.duration || '',
        cdr.billed_duration || '',
        cdr.cli || '',
        cdr.cld || '',
        cdr.cost || '',
        cdr.country || '',
        cdr.description || '',
        cdr.result ?? '',
        cdr.protocol || '',
        cdr.remote_ip || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cdrs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchCdrs(1);
  }, [targetAccountId]);

  if (isLoading && cdrs.length === 0) {
    return (
      <div 
        className="min-h-[400px] flex items-center justify-center"
        style={features.gradientBackground ? getGradientStyle() : {}}
      >
        <div className="text-center space-y-4">
          <div 
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
              {t('cdrs.loading.title')}
            </h3>
            <p className="text-muted-foreground">{t('cdrs.loading.subtitle')}</p>
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
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-destructive">{t('cdrs.errors.loadingTitle')}</CardTitle>
              <CardDescription>{t('cdrs.errors.loadingDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => fetchCdrs()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('cdrs.errors.tryAgain')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user?.sippyAccountId && !accountId) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-destructive">{t('cdrs.errors.noSippyAccountTitle')}</CardTitle>
              <CardDescription>{t('cdrs.errors.noSippyAccountDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {t('cdrs.errors.noSippyAccountMessage')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
            >
              <BarChart3 className="h-4 w-4" />
              {t('cdrs.header.title')}
            </div>
          </div>
          <p className="text-muted-foreground">
            {stats.total === 1 
              ? t('cdrs.header.recordCount', { count: stats.total.toString(), accountId: (targetAccountId || 0).toString() })
              : t('cdrs.header.recordCountPlural', { count: stats.total.toString(), accountId: (targetAccountId || 0).toString() })
            }
            {filters.result_type && filters.result_type !== 'all' && (
              <span className="ml-2">
                • {t('cdrs.header.filteredBy', { filter: filters.result_type.replace('_', ' ') })}
                {cdrs.length !== filteredCdrs.length && (
                  <span className="text-amber-600"> {t('cdrs.header.hiddenRecords', { count: (cdrs.length - filteredCdrs.length).toString() })}</span>
                )}
              </span>
            )}
            {lastRefresh && (
              <span className="ml-2">
                • {t('cdrs.header.lastUpdated', { time: format(lastRefresh, 'HH:mm:ss') })}
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
            {t('cdrs.header.buttons.filters')}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchCdrs()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('cdrs.header.buttons.refresh')}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToCsv}
            disabled={filteredCdrs.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('cdrs.header.buttons.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('cdrs.stats.totalRecords.title')}</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.total}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <FileText className="h-6 w-6" style={{ color: colors.primary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('cdrs.stats.totalCost.title')}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.totalCost, filteredCdrs[0]?.payment_currency)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Duration */}
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('cdrs.stats.avgDuration.title')}</p>
                <p className="text-2xl font-bold text-brand">
                  {formatDuration(stats.avgDuration)}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.secondary}20` }}
              >
                <Timer className="h-6 w-6" style={{ color: colors.secondary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('cdrs.stats.successRate.title')}</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.total > 0 ? Math.round((stats.completedCalls / stats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('cdrs.stats.successRate.subtitle', { successful: stats.completedCalls.toString(), total: stats.total.toString() })}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.accent}20` }}
              >
                <Activity className="h-6 w-6" style={{ color: colors.accent }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-5 w-5" style={{ color: colors.primary }} />
                {t('cdrs.filters.title')}
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
                <Label>{t('cdrs.filters.fields.type.label')}</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => handleFilterChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('cdrs.filters.fields.type.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_zero_and_errors">{t('cdrs.filters.fields.type.options.nonZeroAndErrors')}</SelectItem>
                    <SelectItem value="non_zero">{t('cdrs.filters.fields.type.options.nonZero')}</SelectItem>
                    <SelectItem value="all">{t('cdrs.filters.fields.type.options.all')}</SelectItem>
                    <SelectItem value="complete">{t('cdrs.filters.fields.type.options.complete')}</SelectItem>
                    <SelectItem value="incomplete">{t('cdrs.filters.fields.type.options.incomplete')}</SelectItem>
                    <SelectItem value="errors">{t('cdrs.filters.fields.type.options.errors')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('cdrs.filters.fields.resultType.label')}</Label>
                <Select
                  value={filters.result_type || "all"}
                  onValueChange={(value) => handleFilterChange('result_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('cdrs.filters.fields.resultType.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('cdrs.filters.fields.resultType.options.all')}</SelectItem>
                    <SelectItem value="success">{t('cdrs.filters.fields.resultType.options.success')}</SelectItem>
                    <SelectItem value="billing">{t('cdrs.filters.fields.resultType.options.billing')}</SelectItem>
                    <SelectItem value="rate_limiting">{t('cdrs.filters.fields.resultType.options.rateLimiting')}</SelectItem>
                    <SelectItem value="translation">{t('cdrs.filters.fields.resultType.options.translation')}</SelectItem>
                    <SelectItem value="capacity">{t('cdrs.filters.fields.resultType.options.capacity')}</SelectItem>
                    <SelectItem value="routing">{t('cdrs.filters.fields.resultType.options.routing')}</SelectItem>
                    <SelectItem value="protocol">{t('cdrs.filters.fields.resultType.options.protocol')}</SelectItem>
                    <SelectItem value="account">{t('cdrs.filters.fields.resultType.options.account')}</SelectItem>
                    <SelectItem value="compliance">{t('cdrs.filters.fields.resultType.options.compliance')}</SelectItem>
                    <SelectItem value="client_error">{t('cdrs.filters.fields.resultType.options.clientError')}</SelectItem>
                    <SelectItem value="server_error">{t('cdrs.filters.fields.resultType.options.serverError')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('cdrs.filters.fields.startDate.label')}</Label>
                <Input
                  type="datetime-local"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('cdrs.filters.fields.endDate.label')}</Label>
                <Input
                  type="datetime-local"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('cdrs.filters.fields.cli.label')}</Label>
                <Input
                  value={filters.cli}
                  onChange={(e) => handleFilterChange('cli', e.target.value)}
                  placeholder={t('cdrs.filters.fields.cli.placeholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('cdrs.filters.fields.cld.label')}</Label>
                <Input
                  value={filters.cld}
                  onChange={(e) => handleFilterChange('cld', e.target.value)}
                  placeholder={t('cdrs.filters.fields.cld.placeholder')}
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
                    {t('cdrs.filters.buttons.apply')}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    {t('cdrs.filters.buttons.apply')}
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
                {t('cdrs.filters.buttons.clear')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CDR Table */}
      {stats.total === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div 
                className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
              >
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                  {t('cdrs.table.empty.title')}
                </h3>
                <p className="text-muted-foreground">
                  {t('cdrs.table.empty.description', { accountId: (targetAccountId || 0).toString() })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: colors.primary }} />
                {t('cdrs.table.title')}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {t('cdrs.table.showing', { start: startRecord.toString(), end: endRecord.toString(), total: totalRecords.toString() })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('cdrs.table.headers.call')}</TableHead>
                    <TableHead>{t('cdrs.table.headers.connectTime')}</TableHead>
                    <TableHead>{t('cdrs.table.headers.duration')}</TableHead>
                    <TableHead>{t('cdrs.table.headers.cost')}</TableHead>
                    <TableHead>{t('cdrs.table.headers.country')}</TableHead>
                    <TableHead>{t('cdrs.table.headers.protocol')}</TableHead>
                    <TableHead>{t('cdrs.table.headers.result')}</TableHead>
                    <TableHead>{t('cdrs.table.headers.remoteIp')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCdrs.map((cdr, index) => {
                    const connectDate = parseSippyDate(cdr.connect_time);
                    
                    return (
                      <TableRow key={cdr.i_cdr || index} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {cdr.cli} → {cdr.cld}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {cdr.i_call || cdr.call_id}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {connectDate ? format(connectDate, 'HH:mm:ss') : t('cdrs.table.row.na')}
                          </div>
                          {connectDate && (
                            <div className="text-xs text-muted-foreground">
                              {format(connectDate, 'MMM dd')}
                            </div>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {formatDuration(cdr.duration || 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('cdrs.table.row.billed', { duration: formatDuration(cdr.billed_duration || 0) })}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {formatCurrency(parseFloat(cdr.cost) || 0, cdr.payment_currency)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-medium text-foreground">{cdr.country || t('cdrs.table.row.na')}</div>
                          <div className="text-xs text-muted-foreground">
                            {cdr.description || t('cdrs.table.row.na')}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {cdr.protocol || t('cdrs.table.row.na')}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          {getCallResultBadge(cdr.result)}
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{cdr.remote_ip || t('cdrs.table.row.na')}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          
          {/* Pagination */}
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {t('cdrs.pagination.showing', { start: startRecord.toString(), end: endRecord.toString(), total: totalRecords.toString() })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('cdrs.pagination.recordsPerPage')}</span>
                  <Select
                    value={recordsPerPage.toString()}
                    onValueChange={(value) => {
                      const newLimit = parseInt(value);
                      setRecordsPerPage(newLimit);
                      setCurrentPage(1);
                      fetchCdrs(1, newLimit);
                    }}
                  >
                    <SelectTrigger className="w-[100px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {t('cdrs.pagination.page', { current: currentPage.toString(), total: totalPages.toString() })}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1 || isLoading}
                    className="h-8 w-8 p-0"
                  >
                    <span className="sr-only">{t('cdrs.pagination.buttons.first')}</span>
                    ⟪
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Page numbers */}
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    // Adjust start page if we're near the end
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={i === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(i)}
                          disabled={isLoading}
                          className="h-8 w-8 p-0"
                          style={i === currentPage ? { backgroundColor: colors.primary } : {}}
                        >
                          {i}
                        </Button>
                      );
                    }
                    return pages;
                  })()}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages || isLoading}
                    className="h-8 w-8 p-0"
                  >
                    <span className="sr-only">{t('cdrs.pagination.buttons.last')}</span>
                    ⟫
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Codes Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" style={{ color: colors.primary }} />
{t('cdrs.resultCodes.title')}
          </CardTitle>
          <CardDescription>
{t('cdrs.resultCodes.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {t('cdrs.resultCodes.categories.successful.title')}
              </h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• <strong>0, 200:</strong> {t('cdrs.resultLabels.success')}</li>
                <li>• <strong>1xx:</strong> {t('cdrs.resultLabels.trying')}, {t('cdrs.resultLabels.ringing')}</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                {t('cdrs.resultCodes.categories.commonIssues.title')}
              </h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• <strong>-20:</strong> {t('cdrs.resultLabels.insufficientBalance')}</li>
                <li>• <strong>-18 to -19:</strong> {t('cdrs.resultLabels.cpsLimitAccount')}</li>
                <li>• <strong>486:</strong> Busy here</li>
                <li>• <strong>404:</strong> Number not found</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                {t('cdrs.resultCodes.categories.systemErrors.title')}
              </h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• <strong>5xx:</strong> Server errors</li>
                <li>• <strong>-4, -16:</strong> {t('cdrs.resultLabels.connectionCapacityExceeded')}</li>
                <li>• <strong>-25:</strong> {t('cdrs.resultLabels.noRoutesFound')}</li>
                <li>• <strong>488:</strong> {t('cdrs.resultLabels.unacceptableCodec')}</li>
              </ul>
            </div>
          </div>
          

        </CardContent>
              </Card>
      </div>
    </TooltipProvider>
  );
} 