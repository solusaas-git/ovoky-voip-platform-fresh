'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, MessageSquare, Clock, CheckCircle, XCircle, AlertTriangle, Trash2, Star, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SenderId {
  _id: string;
  senderId: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  type: 'alphanumeric' | 'numeric';
  usageCount: number;
  lastUsedAt?: string;
  isDefault: boolean;
  rejectionReason?: string;
  suspensionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface BlacklistedNumber {
  _id: string;
  phoneNumber: string;
  reason?: string;
  isGlobal: boolean;
  notes?: string;
  tags?: string[];
  addedBy?: any;
  createdAt: string;
  updatedAt: string;
}

interface RequestFormData {
  senderId: string;
  description: string;
  type: 'alphanumeric' | 'numeric';
}

interface BlacklistFormData {
  phoneNumber: string;
  reason: string;
}

interface SmsGateway {
  _id: string;
  name: string; // Admin name
  displayName: string; // User-facing name
  type: string; // 'one-way' | 'two-way'
  provider: string; // 'twilio' | 'aws-sns' | etc.
  isActive: boolean;
  supportedCountries: string[];
  rateLimit?: {
    messagesPerSecond: number;
    messagesPerMinute: number;
    messagesPerHour: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Country {
  _id: string;
  name: string;
  code: string;
  phoneCode: string;
  isActive: boolean;
}

// Component to display supported countries for a gateway
interface SupportedCountriesProps {
  countryCodes: string[];
  countries: Country[];
}

function SupportedCountries({ countryCodes, countries }: SupportedCountriesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!countryCodes || countryCodes.length === 0) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Globe className="h-3 w-3" />
        <span className="text-sm">All countries</span>
      </div>
    );
  }

  // Map country codes to country names
  const supportedCountries = countryCodes
    .map(code => countries.find(country => country.code === code))
    .filter(Boolean) as Country[];

  // Show first 3 countries and count
  const displayCountries = isExpanded ? supportedCountries : supportedCountries.slice(0, 3);
  const hasMore = supportedCountries.length > 3;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {displayCountries.map((country) => (
          <Badge 
            key={country.code} 
            variant="outline" 
            className="text-xs"
          >
            {country.name}
          </Badge>
        ))}
        {hasMore && !isExpanded && (
          <Badge variant="secondary" className="text-xs">
            +{supportedCountries.length - 3} more
          </Badge>
        )}
      </div>
      
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground hover:text-foreground p-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show all ({supportedCountries.length})
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export function SmsSettings() {
  const { t } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [gatewaysLoading, setGatewaysLoading] = useState(true);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [senderIds, setSenderIds] = useState<SenderId[]>([]);
  const [blacklistedNumbers, setBlacklistedNumbers] = useState<BlacklistedNumber[]>([]);
  const [smsGateways, setSmsGateways] = useState<SmsGateway[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isBlacklistDialogOpen, setIsBlacklistDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<RequestFormData>({
    senderId: '',
    description: '',
    type: 'alphanumeric'
  });

  const [errors, setErrors] = useState({
    senderId: '',
    description: ''
  });

  const [blacklistFormData, setBlacklistFormData] = useState<BlacklistFormData>({
    phoneNumber: '',
    reason: ''
  });

  const [blacklistErrors, setBlacklistErrors] = useState({
    phoneNumber: '',
    reason: ''
  });

  useEffect(() => {
    loadSenderIds();
    loadBlacklistedNumbers();
    loadSmsGateways();
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setCountriesLoading(true);
      const response = await fetch('/api/countries');
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      } else {
        console.error('Failed to load countries');
      }
    } catch (error) {
      console.error('Failed to load countries:', error);
    } finally {
      setCountriesLoading(false);
    }
  };

  const loadSenderIds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sms/sender-ids');
      if (response.ok) {
        const data = await response.json();
        setSenderIds(data.senderIds || []);
      } else {
        toast.error(t('sms.common.messages.error'), {
          description: 'Failed to load sender IDs'
        });
      }
    } catch (error) {
      console.error('Failed to load sender IDs:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to load sender IDs'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBlacklistedNumbers = async () => {
    try {
      const response = await fetch('/api/sms/blacklisted-numbers');
      if (response.ok) {
        const data = await response.json();
        setBlacklistedNumbers(data.blacklistedNumbers || []);
      } else {
        toast.error(t('sms.common.messages.error'), {
          description: 'Failed to load blacklisted numbers'
        });
      }
    } catch (error) {
      console.error('Failed to load blacklisted numbers:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to load blacklisted numbers'
      });
    }
  };

  const loadSmsGateways = async () => {
    try {
      setGatewaysLoading(true);
      const response = await fetch('/api/sms/providers');
      if (response.ok) {
        const data = await response.json();
        setSmsGateways(data.providers || []);
      } else {
        toast.error(t('sms.common.messages.error'), {
          description: 'Failed to load SMS gateways'
        });
      }
    } catch (error) {
      console.error('Failed to load SMS gateways:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to load SMS gateways'
      });
    } finally {
      setGatewaysLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {
      senderId: '',
      description: ''
    };

    // Validate sender ID
    if (!formData.senderId.trim()) {
      newErrors.senderId = 'Sender ID is required';
    } else if (formData.type === 'alphanumeric') {
      // Alphanumeric sender IDs: max 11 characters, letters and numbers only
      if (formData.senderId.length > 11) {
        newErrors.senderId = 'Alphanumeric sender ID cannot exceed 11 characters';
      } else if (!/^[a-zA-Z0-9]+$/.test(formData.senderId)) {
        newErrors.senderId = 'Alphanumeric sender ID must contain only letters and numbers';
      } else if (/^\d+$/.test(formData.senderId)) {
        newErrors.senderId = 'Alphanumeric sender ID cannot be only digits';
      }
    } else if (formData.type === 'numeric') {
      // Numeric sender IDs: phone numbers with optional + prefix, up to 20 characters
      if (formData.senderId.length > 20) {
        newErrors.senderId = 'Numeric sender ID cannot exceed 20 characters';
      } else if (!/^(\+)?[0-9]+$/.test(formData.senderId)) {
        newErrors.senderId = 'Numeric sender ID must be a valid phone number (digits only, optional + prefix)';
      } else if (formData.senderId.replace('+', '').length < 7) {
        newErrors.senderId = 'Numeric sender ID must be at least 7 digits';
      }
    }

    // Check if sender ID already exists
    if (senderIds.some(s => s.senderId.toLowerCase() === formData.senderId.toLowerCase())) {
      newErrors.senderId = 'This sender ID already exists';
    }

    // Validate description
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleRequestSenderId = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sms/sender-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t('sms.common.messages.success'), {
          description: 'Sender ID request submitted successfully'
        });
        setIsRequestDialogOpen(false);
        resetForm();
        loadSenderIds(); // Reload the list
      } else {
        const errorData = await response.json();
        toast.error(t('sms.common.messages.error'), {
          description: errorData.error || 'Failed to submit sender ID request'
        });
      }
    } catch (error) {
      console.error('Failed to request sender ID:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to submit sender ID request'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSenderId = async (senderIdObj: SenderId) => {
    if (!confirm(`Are you sure you want to delete sender ID "${senderIdObj.senderId}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/sms/sender-ids/${senderIdObj._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('sms.common.messages.success'), {
          description: 'Sender ID deleted successfully'
        });
        loadSenderIds(); // Reload the list
      } else {
        const errorData = await response.json();
        toast.error(t('sms.common.messages.error'), {
          description: errorData.error || 'Failed to delete sender ID'
        });
      }
    } catch (error) {
      console.error('Failed to delete sender ID:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to delete sender ID'
      });
    }
  };

  const handleSetDefault = async (senderIdObj: SenderId) => {
    try {
      const response = await fetch(`/api/sms/sender-ids/${senderIdObj._id}/set-default`, {
        method: 'PATCH',
      });

      if (response.ok) {
        toast.success(t('sms.common.messages.success'), {
          description: 'Default sender ID updated successfully'
        });
        loadSenderIds(); // Reload the list
      } else {
        const errorData = await response.json();
        toast.error(t('sms.common.messages.error'), {
          description: errorData.error || 'Failed to set default sender ID'
        });
      }
    } catch (error) {
      console.error('Failed to set default sender ID:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to set default sender ID'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      senderId: '',
      description: '',
      type: 'alphanumeric'
    });
    setErrors({
      senderId: '',
      description: ''
    });
  };

  const validateBlacklistForm = () => {
    const newErrors = {
      phoneNumber: '',
      reason: ''
    };

    // Validate phone number
    if (!blacklistFormData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else {
      const normalizedPhone = blacklistFormData.phoneNumber.replace(/[\s\-\(\)]/g, '');
      if (!/^\+?[1-9]\d{6,19}$/.test(normalizedPhone)) {
        newErrors.phoneNumber = 'Phone number must be in valid international format';
      }
    }

    // Check if already blacklisted
    if (blacklistedNumbers.some(n => n.phoneNumber === blacklistFormData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phoneNumber = 'This phone number is already blacklisted';
    }

    // Validate reason (optional but recommended)
    if (blacklistFormData.reason && blacklistFormData.reason.length > 500) {
      newErrors.reason = 'Reason cannot exceed 500 characters';
    }

    setBlacklistErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleAddToBlacklist = async () => {
    if (!validateBlacklistForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sms/blacklisted-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blacklistFormData),
      });

      if (response.ok) {
        toast.success(t('sms.common.messages.success'), {
          description: 'Phone number added to blacklist successfully'
        });
        setIsBlacklistDialogOpen(false);
        resetBlacklistForm();
        loadBlacklistedNumbers(); // Reload the list
      } else {
        const errorData = await response.json();
        toast.error(t('sms.common.messages.error'), {
          description: errorData.error || 'Failed to add phone number to blacklist'
        });
      }
    } catch (error) {
      console.error('Failed to add to blacklist:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to add phone number to blacklist'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFromBlacklist = async (blacklistedNumber: BlacklistedNumber) => {
    if (!confirm(`Are you sure you want to remove ${blacklistedNumber.phoneNumber} from the blacklist?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/sms/blacklisted-numbers/${blacklistedNumber._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('sms.common.messages.success'), {
          description: 'Phone number removed from blacklist successfully'
        });
        loadBlacklistedNumbers(); // Reload the list
      } else {
        const errorData = await response.json();
        toast.error(t('sms.common.messages.error'), {
          description: errorData.error || 'Failed to remove phone number from blacklist'
        });
      }
    } catch (error) {
      console.error('Failed to remove from blacklist:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to remove phone number from blacklist'
      });
    }
  };

  const resetBlacklistForm = () => {
    setBlacklistFormData({
      phoneNumber: '',
      reason: ''
    });
    setBlacklistErrors({
      phoneNumber: '',
      reason: ''
    });
  };

  const getStatusBadge = (status: SenderId['status']) => {
    const statusConfig = {
      pending: { 
        icon: Clock, 
        variant: 'secondary' as const, 
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        label: t('sms.settings.senderIds.status.pending')
      },
      approved: { 
        icon: CheckCircle, 
        variant: 'secondary' as const, 
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        label: t('sms.settings.senderIds.status.approved')
      },
      rejected: { 
        icon: XCircle, 
        variant: 'secondary' as const, 
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        label: t('sms.settings.senderIds.status.rejected')
      },
      suspended: { 
        icon: AlertTriangle, 
        variant: 'secondary' as const, 
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        label: 'Suspended'
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('sms.settings.title')}</h2>
          <p className="text-muted-foreground">{t('sms.settings.description')}</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-4">{t('sms.common.messages.loading')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('sms.settings.title')}</h2>
        <p className="text-muted-foreground">{t('sms.settings.description')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Sender IDs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t('sms.settings.senderIds.title')}
                </CardTitle>
                <CardDescription>
                  {t('sms.settings.senderIds.description')}
                </CardDescription>
              </div>
              <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {t('sms.settings.senderIds.request')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request New Sender ID</DialogTitle>
                    <DialogDescription>
                      Submit a request for a new sender ID. It will be reviewed by administrators.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="senderId">{t('sms.settings.senderIds.form.senderId.label')}</Label>
                      <Input
                        id="senderId"
                        value={formData.senderId}
                        onChange={(e) => setFormData({ ...formData, senderId: formData.type === 'alphanumeric' ? e.target.value.toUpperCase() : e.target.value })}
                        placeholder={formData.type === 'numeric' ? '+212649798920' : t('sms.settings.senderIds.form.senderId.placeholder')}
                        maxLength={formData.type === 'numeric' ? 20 : 11}
                        className={errors.senderId ? 'border-destructive' : ''}
                      />
                      {errors.senderId && (
                        <p className="text-sm text-destructive">{errors.senderId}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="type">{t('sms.settings.senderIds.form.type.label')}</Label>
                      <Select value={formData.type} onValueChange={(value: 'alphanumeric' | 'numeric') => setFormData({ ...formData, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alphanumeric">{t('sms.settings.senderIds.form.type.alphanumeric')}</SelectItem>
                          <SelectItem value="numeric">{t('sms.settings.senderIds.form.type.numeric')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {formData.type === 'alphanumeric' 
                          ? 'Company names or brands (max 11 characters, letters & numbers)'
                          : 'Phone numbers with optional + prefix (e.g., +212649798920)'
                        }
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">{t('sms.settings.senderIds.form.justification.label')}</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder={t('sms.settings.senderIds.form.justification.placeholder')}
                        rows={3}
                        maxLength={500}
                        className={errors.description ? 'border-destructive' : ''}
                      />
                      {errors.description && (
                        <p className="text-sm text-destructive">{errors.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formData.description.length}/500 characters
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsRequestDialogOpen(false);
                        resetForm();
                      }}
                    >
                      {t('sms.common.buttons.cancel')}
                    </Button>
                    <Button 
                      onClick={handleRequestSenderId}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {senderIds.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground mt-4">{t('sms.settings.senderIds.empty')}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Request your first sender ID to get started
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('sms.settings.senderIds.columns.senderId')}</TableHead>
                    <TableHead>{t('sms.settings.senderIds.columns.status')}</TableHead>
                    <TableHead>{t('sms.settings.senderIds.columns.type')}</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>{t('sms.settings.senderIds.columns.requested')}</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {senderIds.map((senderId) => (
                    <TableRow key={senderId._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{senderId.senderId}</span>
                                                     {senderId.isDefault && (
                             <Star className="h-4 w-4 text-yellow-500 fill-current" />
                           )}
                        </div>
                        {senderId.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {senderId.description}
                          </div>
                        )}
                        {(senderId.rejectionReason || senderId.suspensionReason) && (
                          <div className="text-sm text-destructive mt-1">
                            Reason: {senderId.rejectionReason || senderId.suspensionReason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(senderId.status)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {senderId.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{senderId.usageCount} times</div>
                          {senderId.lastUsedAt && (
                            <div className="text-muted-foreground">
                              Last: {formatDistanceToNow(new Date(senderId.lastUsedAt), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(senderId.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {senderId.status === 'approved' && !senderId.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(senderId)}
                              title="Set as default"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          {(senderId.status === 'pending' || senderId.status === 'rejected') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSenderId(senderId)}
                              className="text-destructive hover:text-destructive"
                              title="Delete sender ID"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Blacklisted Numbers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  {t('sms.settings.blacklist.title')}
                </CardTitle>
                <CardDescription>
                  {t('sms.settings.blacklist.description')}
                </CardDescription>
              </div>
              <Dialog open={isBlacklistDialogOpen} onOpenChange={setIsBlacklistDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {t('sms.settings.blacklist.addButton')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('sms.settings.blacklist.addTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('sms.settings.blacklist.addDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="blacklist-phone">{t('sms.settings.blacklist.phoneNumber')} *</Label>
                      <Input
                        id="blacklist-phone"
                        value={blacklistFormData.phoneNumber}
                        onChange={(e) => setBlacklistFormData({ ...blacklistFormData, phoneNumber: e.target.value })}
                        placeholder="+212649798920"
                        className={blacklistErrors.phoneNumber ? 'border-destructive' : ''}
                      />
                      {blacklistErrors.phoneNumber && (
                        <p className="text-sm text-destructive">{blacklistErrors.phoneNumber}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="blacklist-reason">{t('sms.settings.blacklist.reason')}</Label>
                      <Textarea
                        id="blacklist-reason"
                        value={blacklistFormData.reason}
                        onChange={(e) => setBlacklistFormData({ ...blacklistFormData, reason: e.target.value })}
                        placeholder={t('sms.settings.blacklist.reasonPlaceholder')}
                        rows={3}
                        maxLength={500}
                        className={blacklistErrors.reason ? 'border-destructive' : ''}
                      />
                      {blacklistErrors.reason && (
                        <p className="text-sm text-destructive">{blacklistErrors.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {blacklistFormData.reason.length}/500 characters
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsBlacklistDialogOpen(false);
                        resetBlacklistForm();
                      }}
                    >
                      {t('sms.common.buttons.cancel')}
                    </Button>
                    <Button 
                      onClick={handleAddToBlacklist}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t('sms.settings.blacklist.adding') : t('sms.settings.blacklist.addAction')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {blacklistedNumbers.length === 0 ? (
              <div className="text-center py-8">
                <XCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground mt-4">{t('sms.settings.blacklist.empty')}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('sms.settings.blacklist.emptyDescription')}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('sms.settings.blacklist.table.phoneNumber')}</TableHead>
                    <TableHead>{t('sms.settings.blacklist.table.reason')}</TableHead>
                    <TableHead>{t('sms.settings.blacklist.table.type')}</TableHead>
                    <TableHead>{t('sms.settings.blacklist.table.added')}</TableHead>
                    <TableHead>{t('sms.settings.blacklist.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blacklistedNumbers.map((number) => (
                    <TableRow key={number._id}>
                      <TableCell>
                        <span className="font-mono">{number.phoneNumber}</span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {number.reason ? (
                            <span className="text-sm">{number.reason}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">{t('sms.settings.blacklist.table.noReason')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={number.isGlobal ? 'destructive' : 'secondary'}>
                          {number.isGlobal ? t('sms.settings.blacklist.table.global') : t('sms.settings.blacklist.table.personal')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(number.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!number.isGlobal && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromBlacklist(number)}
                            className="text-destructive hover:text-destructive"
                            title={t('sms.settings.blacklist.remove')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* SMS Gateways */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('sms.settings.providers.title')}
            </CardTitle>
            <CardDescription>
              {t('sms.settings.providers.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gatewaysLoading ? (
              <div className="text-center py-8">
                <Settings className="mx-auto h-12 w-12 text-muted-foreground/50 animate-spin" />
                <p className="text-muted-foreground mt-4">Loading SMS gateways...</p>
              </div>
            ) : smsGateways.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground mt-4">{t('sms.settings.providers.empty')}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Contact your administrator to assign SMS gateways
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gateway Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Countries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {smsGateways.map((gateway) => (
                    <TableRow key={gateway._id}>
                      <TableCell>
                        <div className="font-medium">{gateway.displayName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {gateway.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={gateway.isActive ? 'default' : 'secondary'}>
                          {gateway.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SupportedCountries countryCodes={gateway.supportedCountries} countries={countries} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 