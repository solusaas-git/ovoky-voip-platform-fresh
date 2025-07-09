'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Eye, RefreshCw, MessageSquare, Database, History, Globe } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface SmsHistoryItem {
  _id: string;
  userId: string;
  to: string;
  from: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  cost: number;
  providerId: string;
  providerName: string;
  providerResponse?: any;
  sendingId?: string;
  userName: string;
  userEmail: string;
  companyName?: string;
  errorMessage?: string;
  retryCount?: number;
  maxRetries?: number;
  createdAt: string;
  updatedAt: string;
}

// Component to display country flag
function CountryFlag({ countryIso, countryName }: { countryIso: string; countryName: string }) {
  if (countryIso === 'XX') {
    // Unknown country - show globe icon
    return (
      <div className="w-6 h-4 flex items-center justify-center bg-gray-100 rounded-sm">
        <Globe className="h-3 w-3 text-gray-500" />
      </div>
    );
  }

  try {
    return (
      <Image
        src={`https://flagcdn.com/w40/${countryIso.toLowerCase()}.png`}
        alt={`${countryName} flag`}
        width={24}
        height={16}
        className="rounded-sm border border-gray-200"
        onError={(e) => {
          // Fallback to globe icon if flag fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = '<div class="w-6 h-4 flex items-center justify-center bg-gray-100 rounded-sm"><svg class="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg></div>';
          }
        }}
      />
    );
  } catch {
    return (
      <div className="w-6 h-4 flex items-center justify-center bg-gray-100 rounded-sm">
        <Globe className="h-3 w-3 text-gray-500" />
      </div>
    );
  }
}

// Function to get country info from phone number
function getCountryFromPhoneNumber(phoneNumber: string): { countryName: string; countryIso: string } {
  // Remove any non-digit characters and leading +
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Common country codes mapping
  const countryMapping: Record<string, { name: string; iso: string }> = {
    '1': { name: 'United States', iso: 'US' },
    '7': { name: 'Russia', iso: 'RU' },
    '20': { name: 'Egypt', iso: 'EG' },
    '27': { name: 'South Africa', iso: 'ZA' },
    '30': { name: 'Greece', iso: 'GR' },
    '31': { name: 'Netherlands', iso: 'NL' },
    '32': { name: 'Belgium', iso: 'BE' },
    '33': { name: 'France', iso: 'FR' },
    '34': { name: 'Spain', iso: 'ES' },
    '36': { name: 'Hungary', iso: 'HU' },
    '39': { name: 'Italy', iso: 'IT' },
    '40': { name: 'Romania', iso: 'RO' },
    '41': { name: 'Switzerland', iso: 'CH' },
    '43': { name: 'Austria', iso: 'AT' },
    '44': { name: 'United Kingdom', iso: 'GB' },
    '45': { name: 'Denmark', iso: 'DK' },
    '46': { name: 'Sweden', iso: 'SE' },
    '47': { name: 'Norway', iso: 'NO' },
    '48': { name: 'Poland', iso: 'PL' },
    '49': { name: 'Germany', iso: 'DE' },
    '51': { name: 'Peru', iso: 'PE' },
    '52': { name: 'Mexico', iso: 'MX' },
    '53': { name: 'Cuba', iso: 'CU' },
    '54': { name: 'Argentina', iso: 'AR' },
    '55': { name: 'Brazil', iso: 'BR' },
    '56': { name: 'Chile', iso: 'CL' },
    '57': { name: 'Colombia', iso: 'CO' },
    '58': { name: 'Venezuela', iso: 'VE' },
    '60': { name: 'Malaysia', iso: 'MY' },
    '61': { name: 'Australia', iso: 'AU' },
    '62': { name: 'Indonesia', iso: 'ID' },
    '63': { name: 'Philippines', iso: 'PH' },
    '64': { name: 'New Zealand', iso: 'NZ' },
    '65': { name: 'Singapore', iso: 'SG' },
    '66': { name: 'Thailand', iso: 'TH' },
    '81': { name: 'Japan', iso: 'JP' },
    '82': { name: 'South Korea', iso: 'KR' },
    '84': { name: 'Vietnam', iso: 'VN' },
    '86': { name: 'China', iso: 'CN' },
    '90': { name: 'Turkey', iso: 'TR' },
    '91': { name: 'India', iso: 'IN' },
    '92': { name: 'Pakistan', iso: 'PK' },
    '93': { name: 'Afghanistan', iso: 'AF' },
    '94': { name: 'Sri Lanka', iso: 'LK' },
    '95': { name: 'Myanmar', iso: 'MM' },
    '98': { name: 'Iran', iso: 'IR' },
    '212': { name: 'Morocco', iso: 'MA' },
    '213': { name: 'Algeria', iso: 'DZ' },
    '216': { name: 'Tunisia', iso: 'TN' },
    '218': { name: 'Libya', iso: 'LY' },
    '220': { name: 'Gambia', iso: 'GM' },
    '221': { name: 'Senegal', iso: 'SN' },
    '222': { name: 'Mauritania', iso: 'MR' },
    '223': { name: 'Mali', iso: 'ML' },
    '224': { name: 'Guinea', iso: 'GN' },
    '225': { name: 'Ivory Coast', iso: 'CI' },
    '226': { name: 'Burkina Faso', iso: 'BF' },
    '227': { name: 'Niger', iso: 'NE' },
    '228': { name: 'Togo', iso: 'TG' },
    '229': { name: 'Benin', iso: 'BJ' },
    '230': { name: 'Mauritius', iso: 'MU' },
    '231': { name: 'Liberia', iso: 'LR' },
    '232': { name: 'Sierra Leone', iso: 'SL' },
    '233': { name: 'Ghana', iso: 'GH' },
    '234': { name: 'Nigeria', iso: 'NG' },
    '235': { name: 'Chad', iso: 'TD' },
    '236': { name: 'Central African Republic', iso: 'CF' },
    '237': { name: 'Cameroon', iso: 'CM' },
    '238': { name: 'Cape Verde', iso: 'CV' },
    '239': { name: 'São Tomé and Príncipe', iso: 'ST' },
    '240': { name: 'Equatorial Guinea', iso: 'GQ' },
    '241': { name: 'Gabon', iso: 'GA' },
    '242': { name: 'Republic of the Congo', iso: 'CG' },
    '243': { name: 'Democratic Republic of the Congo', iso: 'CD' },
    '244': { name: 'Angola', iso: 'AO' },
    '245': { name: 'Guinea-Bissau', iso: 'GW' },
    '246': { name: 'British Indian Ocean Territory', iso: 'IO' },
    '248': { name: 'Seychelles', iso: 'SC' },
    '249': { name: 'Sudan', iso: 'SD' },
    '250': { name: 'Rwanda', iso: 'RW' },
    '251': { name: 'Ethiopia', iso: 'ET' },
    '252': { name: 'Somalia', iso: 'SO' },
    '253': { name: 'Djibouti', iso: 'DJ' },
    '254': { name: 'Kenya', iso: 'KE' },
    '255': { name: 'Tanzania', iso: 'TZ' },
    '256': { name: 'Uganda', iso: 'UG' },
    '257': { name: 'Burundi', iso: 'BI' },
    '258': { name: 'Mozambique', iso: 'MZ' },
    '260': { name: 'Zambia', iso: 'ZM' },
    '261': { name: 'Madagascar', iso: 'MG' },
    '262': { name: 'Réunion', iso: 'RE' },
    '263': { name: 'Zimbabwe', iso: 'ZW' },
    '264': { name: 'Namibia', iso: 'NA' },
    '265': { name: 'Malawi', iso: 'MW' },
    '266': { name: 'Lesotho', iso: 'LS' },
    '267': { name: 'Botswana', iso: 'BW' },
    '268': { name: 'Eswatini', iso: 'SZ' },
    '269': { name: 'Comoros', iso: 'KM' },
    '290': { name: 'Saint Helena', iso: 'SH' },
    '291': { name: 'Eritrea', iso: 'ER' },
    '297': { name: 'Aruba', iso: 'AW' },
    '298': { name: 'Faroe Islands', iso: 'FO' },
    '299': { name: 'Greenland', iso: 'GL' },
    '350': { name: 'Gibraltar', iso: 'GI' },
    '351': { name: 'Portugal', iso: 'PT' },
    '352': { name: 'Luxembourg', iso: 'LU' },
    '353': { name: 'Ireland', iso: 'IE' },
    '354': { name: 'Iceland', iso: 'IS' },
    '355': { name: 'Albania', iso: 'AL' },
    '356': { name: 'Malta', iso: 'MT' },
    '357': { name: 'Cyprus', iso: 'CY' },
    '358': { name: 'Finland', iso: 'FI' },
    '359': { name: 'Bulgaria', iso: 'BG' },
    '370': { name: 'Lithuania', iso: 'LT' },
    '371': { name: 'Latvia', iso: 'LV' },
    '372': { name: 'Estonia', iso: 'EE' },
    '373': { name: 'Moldova', iso: 'MD' },
    '374': { name: 'Armenia', iso: 'AM' },
    '375': { name: 'Belarus', iso: 'BY' },
    '376': { name: 'Andorra', iso: 'AD' },
    '377': { name: 'Monaco', iso: 'MC' },
    '378': { name: 'San Marino', iso: 'SM' },
    '380': { name: 'Ukraine', iso: 'UA' },
    '381': { name: 'Serbia', iso: 'RS' },
    '382': { name: 'Montenegro', iso: 'ME' },
    '383': { name: 'Kosovo', iso: 'XK' },
    '385': { name: 'Croatia', iso: 'HR' },
    '386': { name: 'Slovenia', iso: 'SI' },
    '387': { name: 'Bosnia and Herzegovina', iso: 'BA' },
    '389': { name: 'North Macedonia', iso: 'MK' },
    '420': { name: 'Czech Republic', iso: 'CZ' },
    '421': { name: 'Slovakia', iso: 'SK' },
    '423': { name: 'Liechtenstein', iso: 'LI' },
    '500': { name: 'Falkland Islands', iso: 'FK' },
    '501': { name: 'Belize', iso: 'BZ' },
    '502': { name: 'Guatemala', iso: 'GT' },
    '503': { name: 'El Salvador', iso: 'SV' },
    '504': { name: 'Honduras', iso: 'HN' },
    '505': { name: 'Nicaragua', iso: 'NI' },
    '506': { name: 'Costa Rica', iso: 'CR' },
    '507': { name: 'Panama', iso: 'PA' },
    '508': { name: 'Saint Pierre and Miquelon', iso: 'PM' },
    '509': { name: 'Haiti', iso: 'HT' },
    '590': { name: 'Guadeloupe', iso: 'GP' },
    '591': { name: 'Bolivia', iso: 'BO' },
    '592': { name: 'Guyana', iso: 'GY' },
    '593': { name: 'Ecuador', iso: 'EC' },
    '594': { name: 'French Guiana', iso: 'GF' },
    '595': { name: 'Paraguay', iso: 'PY' },
    '596': { name: 'Martinique', iso: 'MQ' },
    '597': { name: 'Suriname', iso: 'SR' },
    '598': { name: 'Uruguay', iso: 'UY' },
    '599': { name: 'Curaçao', iso: 'CW' },
    '670': { name: 'East Timor', iso: 'TL' },
    '672': { name: 'Antarctica', iso: 'AQ' },
    '673': { name: 'Brunei', iso: 'BN' },
    '674': { name: 'Nauru', iso: 'NR' },
    '675': { name: 'Papua New Guinea', iso: 'PG' },
    '676': { name: 'Tonga', iso: 'TO' },
    '677': { name: 'Solomon Islands', iso: 'SB' },
    '678': { name: 'Vanuatu', iso: 'VU' },
    '679': { name: 'Fiji', iso: 'FJ' },
    '680': { name: 'Palau', iso: 'PW' },
    '681': { name: 'Wallis and Futuna', iso: 'WF' },
    '682': { name: 'Cook Islands', iso: 'CK' },
    '683': { name: 'Niue', iso: 'NU' },
    '684': { name: 'American Samoa', iso: 'AS' },
    '685': { name: 'Samoa', iso: 'WS' },
    '686': { name: 'Kiribati', iso: 'KI' },
    '687': { name: 'New Caledonia', iso: 'NC' },
    '688': { name: 'Tuvalu', iso: 'TV' },
    '689': { name: 'French Polynesia', iso: 'PF' },
    '690': { name: 'Tokelau', iso: 'TK' },
    '691': { name: 'Federated States of Micronesia', iso: 'FM' },
    '692': { name: 'Marshall Islands', iso: 'MH' },
    '850': { name: 'North Korea', iso: 'KP' },
    '852': { name: 'Hong Kong', iso: 'HK' },
    '853': { name: 'Macau', iso: 'MO' },
    '855': { name: 'Cambodia', iso: 'KH' },
    '856': { name: 'Laos', iso: 'LA' },
    '880': { name: 'Bangladesh', iso: 'BD' },
    '886': { name: 'Taiwan', iso: 'TW' },
    '960': { name: 'Maldives', iso: 'MV' },
    '961': { name: 'Lebanon', iso: 'LB' },
    '962': { name: 'Jordan', iso: 'JO' },
    '963': { name: 'Syria', iso: 'SY' },
    '964': { name: 'Iraq', iso: 'IQ' },
    '965': { name: 'Kuwait', iso: 'KW' },
    '966': { name: 'Saudi Arabia', iso: 'SA' },
    '967': { name: 'Yemen', iso: 'YE' },
    '968': { name: 'Oman', iso: 'OM' },
    '970': { name: 'Palestine', iso: 'PS' },
    '971': { name: 'United Arab Emirates', iso: 'AE' },
    '972': { name: 'Israel', iso: 'IL' },
    '973': { name: 'Bahrain', iso: 'BH' },
    '974': { name: 'Qatar', iso: 'QA' },
    '975': { name: 'Bhutan', iso: 'BT' },
    '976': { name: 'Mongolia', iso: 'MN' },
    '977': { name: 'Nepal', iso: 'NP' },
    '992': { name: 'Tajikistan', iso: 'TJ' },
    '993': { name: 'Turkmenistan', iso: 'TM' },
    '994': { name: 'Azerbaijan', iso: 'AZ' },
    '995': { name: 'Georgia', iso: 'GE' },
    '996': { name: 'Kyrgyzstan', iso: 'KG' },
    '998': { name: 'Uzbekistan', iso: 'UZ' }
  };

  // Try to match country codes of different lengths (1-3 digits)
  for (let i = 3; i >= 1; i--) {
    const prefix = cleanNumber.substring(0, i);
    if (countryMapping[prefix]) {
      return {
        countryName: countryMapping[prefix].name,
        countryIso: countryMapping[prefix].iso
      };
    }
  }

  // Default to unknown if no match found
  return { countryName: 'Unknown', countryIso: 'XX' };
}

export function AdminSmsHistory() {
  const { t } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<SmsHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    loadMessages();
  }, [page, statusFilter, limit]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/sms/history?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
      } else {
        toast.error('Failed to load SMS history');
      }
    } catch (error) {
      toast.error('Failed to load SMS history');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadMessages();
  };

  const handleLimitChange = (newLimit: string) => {
    setLimit(parseInt(newLimit));
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      sent: 'default',
      delivered: 'default',
      failed: 'destructive',
      undelivered: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <CardTitle>SMS Sending History</CardTitle>
              </div>
              <CardDescription>
                Detailed logs of all SMS messages sent through the system ({total.toLocaleString()} total)
              </CardDescription>
            </div>
            <Button onClick={() => loadMessages()} size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by phone number, user, or message..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="undelivered">Undelivered</SelectItem>
                </SelectContent>
              </Select>
              <Select value={limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Messages Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                    </TableRow>
                  ))
                ) : messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No SMS messages found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((message) => (
                    <TableRow key={message._id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(message.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{message.userName}</div>
                          <div className="text-sm text-muted-foreground">
                            {message.companyName || 'No company'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {message.from || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {message.to}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const countryInfo = getCountryFromPhoneNumber(message.to);
                          return (
                            <div className="flex items-center gap-2">
                              <CountryFlag countryIso={countryInfo.countryIso} countryName={countryInfo.countryName} />
                              <span className="text-sm">{countryInfo.countryName}</span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          {message.providerName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(message.status)}
                      </TableCell>
                      <TableCell className="font-mono">
                        ${message.cost.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>SMS Message Details</DialogTitle>
                              <DialogDescription>
                                Complete information for message sent on {formatDate(message.createdAt)}
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh]">
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Message ID</label>
                                    <p className="text-sm font-mono bg-muted p-2 rounded">
                                      {message._id}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Sending ID</label>
                                    <p className="text-sm font-mono bg-muted p-2 rounded">
                                      {message.sendingId || 'N/A'}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium">User Information</label>
                                  <div className="bg-muted p-3 rounded space-y-1">
                                    <p><strong>Name:</strong> {message.userName}</p>
                                    <p><strong>Email:</strong> {message.userEmail}</p>
                                    <p><strong>Company:</strong> {message.companyName || 'No company'}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">From</label>
                                    <p className="text-sm font-mono bg-muted p-2 rounded">
                                      {message.from}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">To</label>
                                    <p className="text-sm font-mono bg-muted p-2 rounded">
                                      {message.to}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium">Message Content</label>
                                  <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                                    {message.message}
                                  </p>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Provider</label>
                                    <p className="text-sm bg-muted p-2 rounded">
                                      {message.providerName}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="p-2">
                                      {getStatusBadge(message.status)}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Cost</label>
                                    <p className="text-sm font-mono bg-muted p-2 rounded">
                                      ${message.cost.toFixed(4)}
                                    </p>
                                  </div>
                                </div>

                                {(message.status === 'failed' || message.status === 'undelivered') && message.errorMessage && (
                                  <div>
                                    <label className="text-sm font-medium text-red-600">Failure Reason</label>
                                    <div className="bg-red-50 border border-red-200 p-3 rounded">
                                      <p className="text-sm text-red-800">{message.errorMessage}</p>
                                      {message.retryCount !== undefined && message.maxRetries !== undefined && (
                                        <p className="text-xs text-red-600 mt-1">
                                          Retry attempts: {message.retryCount}/{message.maxRetries}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {message.providerResponse && (
                                  <div>
                                    <label className="text-sm font-medium">Provider API Response</label>
                                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                                      {JSON.stringify(message.providerResponse, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total.toLocaleString()} messages
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={page === 1 || loading}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1 || loading}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {page > 3 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage(1)}
                          disabled={loading}
                        >
                          1
                        </Button>
                        {page > 4 && <span className="text-muted-foreground">...</span>}
                      </>
                    )}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                      if (pageNum > totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === page ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          disabled={loading}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {page < totalPages - 2 && (
                      <>
                        {page < totalPages - 3 && <span className="text-muted-foreground">...</span>}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage(totalPages)}
                          disabled={loading}
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages || loading}
                  >
                    Last
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 