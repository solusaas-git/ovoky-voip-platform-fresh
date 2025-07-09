'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Settings, Edit, Trash2, Database, CheckCircle, XCircle, AlertTriangle, ChevronDown, X, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SmsProvider {
  _id: string;
  name: string;
  displayName: string;
  type: 'one-way' | 'two-way';
  provider: string;
  isActive: boolean;
  apiEndpoint?: string;
  supportedCountries: string[];
  rateLimit?: {
    messagesPerSecond: number;
    messagesPerMinute: number;
    messagesPerHour: number;
  };
  webhookUrl?: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

interface ProviderFormData {
  name: string;
  displayName: string;
  type: 'one-way' | 'two-way';
  provider: string;
  isActive: boolean;
  apiEndpoint: string;
  apiKey: string;
  apiSecret: string;
  supportedCountries: string[];
  messagesPerSecond: number;
  messagesPerMinute: number;
  messagesPerHour: number;
  webhookUrl: string;
  settings: string;
}

interface Country {
  _id: string;
  name: string;
  code: string;
  phoneCode: string;
  isActive: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  onboarding?: {
    companyName?: string;
  };
}

interface AssignmentFormData {
  priority: number;
  dailyLimit: string;
  monthlyLimit: string;
  notes: string;
}

interface Assignment {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
    onboarding?: {
      companyName?: string;
    };
  };
  providerId: string;
  isActive: boolean;
  priority: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  notes?: string;
}

// Multi-select country component
interface CountryMultiSelectProps {
  values: string[];
  onValuesChange: (countries: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function CountryMultiSelect({
  values = [],
  onValuesChange,
  placeholder = "Select countries",
  disabled = false,
  className
}: CountryMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load countries when component mounts
  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/countries?isActive=true&limit=1000');
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      }
    } catch (error) {
      toast.error('Failed to load countries');
    } finally {
      setLoading(false);
    }
  };

  // Filter countries based on search query
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.phoneCode.includes(searchQuery)
  ).filter(country => !values.includes(country.name)); // Exclude already selected

  // Get selected countries data
  const selectedCountries = countries.filter(country => 
    values.includes(country.name)
  );

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (country: Country) => {
    if (!values.includes(country.name)) {
      onValuesChange([...values, country.name]);
    }
    setSearchQuery('');
  };

  const handleRemove = (countryName: string) => {
    onValuesChange(values.filter(name => name !== countryName));
  };

  const handleClearAll = () => {
    onValuesChange([]);
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Main Button */}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled || loading}
        className={cn(
          "w-full justify-between font-normal text-left min-h-11 h-auto px-4 py-2",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
      >
        <div className="flex-1 min-w-0">
          {values.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedCountries.slice(0, 3).map((country) => (
                <Badge 
                  key={country.name} 
                  variant="secondary" 
                  className="text-xs font-medium flex items-center gap-1.5 pr-1"
                >
                  <span className="truncate max-w-20">{country.name}</span>
                  <span
                    className="inline-flex items-center justify-center h-4 w-4 p-0 cursor-pointer rounded-sm hover:bg-destructive/20 hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(country.name);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))}
              {values.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{values.length - 3} more
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{loading ? 'Loading countries...' : placeholder}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          {values.length > 0 && !disabled && (
            <span
              className="inline-flex items-center justify-center h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-sm hover:bg-accent transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </div>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-background border border-border rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
              {searchQuery && (
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 inline-flex items-center justify-center cursor-pointer rounded-sm hover:bg-accent transition-colors"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>

          {/* Selected Countries (if any) */}
          {values.length > 0 && (
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Selected ({values.length})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleClearAll}
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedCountries.map((country) => (
                  <Badge 
                    key={country.name} 
                    variant="secondary" 
                    className="text-xs flex items-center gap-1.5 pr-1"
                  >
                    <span>{country.name}</span>
                    <span
                      className="inline-flex items-center justify-center h-4 w-4 p-0 cursor-pointer rounded-sm hover:bg-destructive/20 hover:text-destructive transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(country.name);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available Countries List */}
          <div className="overflow-y-auto max-h-60">
            {filteredCountries.length > 0 ? (
              <div className="py-2">
                {filteredCountries.map((country) => (
                  <button
                    key={country.name}
                    type="button"
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelect(country)}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{country.name}</div>
                      <div className="text-xs text-muted-foreground">{country.code} • +{country.phoneCode}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                {searchQuery ? (
                  <>
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No countries found</p>
                    <p className="text-xs">Try adjusting your search</p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All countries selected</p>
                    <p className="text-xs">Remove some to add others</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminSmsProviders() {
  const { t } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<SmsProvider[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SmsProvider | null>(null);
  const [assigningProvider, setAssigningProvider] = useState<SmsProvider | null>(null);
  
  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    displayName: '',
    type: 'one-way',
    provider: 'smsenvoi',
    isActive: true,
    apiEndpoint: '',
    apiKey: '',
    apiSecret: '',
    supportedCountries: [],
    messagesPerSecond: 10,
    messagesPerMinute: 100,
    messagesPerHour: 1000,
    webhookUrl: '',
    settings: '{}'
  });

  const [errors, setErrors] = useState<Partial<ProviderFormData>>({});
  
  const [assignmentData, setAssignmentData] = useState<AssignmentFormData>({
    priority: 100,
    dailyLimit: '',
    monthlyLimit: '',
    notes: ''
  });
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    loadProviders();
    loadUsers();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sms/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      } else {
        toast.error('Failed to load SMS providers');
      }
    } catch (error) {
      toast.error('Failed to load SMS providers');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      type: 'one-way',
      provider: 'smsenvoi',
      isActive: true,
      apiEndpoint: '',
      apiKey: '',
      apiSecret: '',
      supportedCountries: [],
      messagesPerSecond: 10,
      messagesPerMinute: 100,
      messagesPerHour: 1000,
      webhookUrl: '',
      settings: '{}'
    });
    setErrors({});
    setEditingProvider(null);
  };

  const validateForm = () => {
    const newErrors: Partial<ProviderFormData> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.displayName.trim()) newErrors.displayName = 'Display name is required';
    if (!formData.provider) newErrors.provider = 'Provider type is required';
    
    // Only require API key for new providers, not when editing (to keep current value)
    if (!editingProvider && !formData.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }

    // Validate JSON settings
    if (formData.settings) {
      try {
        JSON.parse(formData.settings);
      } catch {
        newErrors.settings = 'Settings must be valid JSON';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const url = editingProvider 
        ? `/api/admin/sms/providers/${editingProvider._id}`
        : '/api/admin/sms/providers';
      
      const method = editingProvider ? 'PUT' : 'POST';

      // Prepare payload - only include API credentials if they're provided
      const payload: any = {
        ...formData,
        settings: formData.settings ? JSON.parse(formData.settings) : {}
      };

      // When editing, only include API credentials if they're not empty (to keep current values)
      if (editingProvider) {
        if (!formData.apiKey.trim()) {
          delete payload.apiKey;
        }
        if (!formData.apiSecret.trim()) {
          delete payload.apiSecret;
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(editingProvider ? 'Provider updated successfully' : 'Provider created successfully');
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        resetForm();
        loadProviders();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save provider');
      }
    } catch (error) {
      toast.error('Failed to save provider');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (provider: SmsProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      displayName: provider.displayName,
      type: provider.type,
      provider: provider.provider,
      isActive: provider.isActive,
      apiEndpoint: provider.apiEndpoint || '',
      apiKey: '', // Don't prefill sensitive data
      apiSecret: '', // Don't prefill sensitive data
      supportedCountries: provider.supportedCountries || [],
      messagesPerSecond: provider.rateLimit?.messagesPerSecond || 10,
      messagesPerMinute: provider.rateLimit?.messagesPerMinute || 100,
      messagesPerHour: provider.rateLimit?.messagesPerHour || 1000,
      webhookUrl: provider.webhookUrl || '',
      settings: JSON.stringify(provider.settings || {}, null, 2)
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (provider: SmsProvider) => {
    if (!confirm(`Are you sure you want to delete "${provider.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sms/providers/${provider._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Provider deleted successfully');
        loadProviders();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete provider');
      }
    } catch (error) {
      toast.error('Failed to delete provider');
    }
  };

  const handleToggleStatus = async (provider: SmsProvider) => {
    try {
      const response = await fetch(`/api/admin/sms/providers/${provider._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...provider,
          isActive: !provider.isActive
        }),
      });

      if (response.ok) {
        toast.success(`Provider ${provider.isActive ? 'disabled' : 'enabled'} successfully`);
        loadProviders();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update provider status');
      }
    } catch (error) {
      toast.error('Failed to update provider status');
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
        <XCircle className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const handleAssignUsers = async (provider: SmsProvider) => {
    setAssigningProvider(provider);
    setAssignmentData({
      priority: 100,
      dailyLimit: '',
      monthlyLimit: '',
      notes: ''
    });
    setSelectedUsers([]);
    
    // Load existing assignments for this provider
    try {
      const response = await fetch(`/api/admin/sms/user-assignments?providerId=${provider._id}`);
      if (response.ok) {
        const data = await response.json();
        setExistingAssignments(data.assignments || []);
      }
    } catch (error) {
    }
    
    setIsAssignDialogOpen(true);
  };

  const handleCreateAssignments = async () => {
    if (!assigningProvider || selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    try {
      const promises = selectedUsers.map(userId => {
        const payload = {
          userId,
          providerId: assigningProvider._id,
          priority: 100, // Default priority
          isActive: true
        };

        return fetch('/api/admin/sms/user-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount === selectedUsers.length) {
        toast.success(`Successfully assigned provider to ${successCount} user(s)`);
      } else {
        toast.warning(`Assigned to ${successCount} out of ${selectedUsers.length} users`);
      }

      setIsAssignDialogOpen(false);
      setAssigningProvider(null);
      setSelectedUsers([]);
    } catch (error) {
      toast.error('Failed to assign provider');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/admin/sms/user-assignments/${assignmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setExistingAssignments(prev => prev.filter(a => a._id !== assignmentId));
        toast.success('Assignment removed successfully');
      } else {
        toast.error('Failed to remove assignment');
      }
    } catch (error) {
      toast.error('Failed to remove assignment');
    }
  };

  const handleAssignAll = async () => {
    const availableUsers = users.filter(user => !existingAssignments.some(a => a.userId._id === user._id));
    
    if (availableUsers.length === 0) return;
    
    if (!confirm(`Are you sure you want to assign all ${availableUsers.length} available users to this provider?`)) {
      return;
    }

    if (!assigningProvider) return;

    try {
      const promises = availableUsers.map(user => {
        const payload = {
          userId: user._id,
          providerId: assigningProvider._id,
          priority: 100,
          isActive: true
        };

        return fetch('/api/admin/sms/user-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount === availableUsers.length) {
        toast.success(`Successfully assigned all ${successCount} users to provider`);
      } else {
        toast.warning(`Assigned ${successCount} out of ${availableUsers.length} users`);
      }

      // Reload assignments to get current state
      const assignmentsResponse = await fetch(`/api/admin/sms/user-assignments?providerId=${assigningProvider._id}`);
      if (assignmentsResponse.ok) {
        const data = await assignmentsResponse.json();
        setExistingAssignments(data.assignments || []);
      }
    } catch (error) {
      toast.error('Failed to assign users');
    }
  };

  const handleSelectAll = () => {
    const availableUserIds = users
      .filter(user => !existingAssignments.some(a => a.userId._id === user._id))
      .map(user => user._id);
    setSelectedUsers(availableUserIds);
  };

  const handleUnassignAll = async () => {
    if (existingAssignments.length === 0) return;
    
    if (!confirm(`Are you sure you want to unassign all ${existingAssignments.length} users from this provider?`)) {
      return;
    }

    try {
      const promises = existingAssignments.map(assignment => 
        fetch(`/api/admin/sms/user-assignments/${assignment._id}`, {
          method: 'DELETE'
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount === existingAssignments.length) {
        setExistingAssignments([]);
        toast.success(`Successfully unassigned all ${successCount} users`);
      } else {
        toast.warning(`Unassigned ${successCount} out of ${existingAssignments.length} users`);
        // Reload assignments to get current state
        if (assigningProvider) {
          const response = await fetch(`/api/admin/sms/user-assignments?providerId=${assigningProvider._id}`);
          if (response.ok) {
            const data = await response.json();
            setExistingAssignments(data.assignments || []);
          }
        }
      }
    } catch (error) {
      toast.error('Failed to unassign users');
    }
  };

  const handleClearSelection = () => {
    setSelectedUsers([]);
  };

  const handleClearAssignmentSelection = () => {
    setSelectedAssignments([]);
  };

  const handleUnassignSelected = async () => {
    if (selectedAssignments.length === 0) return;
    
    if (!confirm(`Are you sure you want to unassign ${selectedAssignments.length} selected users from this provider?`)) {
      return;
    }

    try {
      const promises = selectedAssignments.map(assignmentId => 
        fetch(`/api/admin/sms/user-assignments/${assignmentId}`, {
          method: 'DELETE'
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount === selectedAssignments.length) {
        setExistingAssignments(prev => prev.filter(a => !selectedAssignments.includes(a._id)));
        setSelectedAssignments([]);
        toast.success(`Successfully unassigned ${successCount} selected users`);
      } else {
        toast.warning(`Unassigned ${successCount} out of ${selectedAssignments.length} users`);
        // Reload assignments to get current state
        if (assigningProvider) {
          const response = await fetch(`/api/admin/sms/user-assignments?providerId=${assigningProvider._id}`);
          if (response.ok) {
            const data = await response.json();
            setExistingAssignments(data.assignments || []);
          }
        }
        setSelectedAssignments([]);
      }
    } catch (error) {
      toast.error('Failed to unassign selected users');
    }
  };

  const providerTypes = [
    { value: 'twilio', label: 'Twilio' },
    { value: 'aws-sns', label: 'AWS SNS' },
    { value: 'messagebird', label: 'MessageBird' },
    { value: 'plivo', label: 'Plivo' },
    { value: 'nexmo', label: 'Vonage (Nexmo)' },
    { value: 'smsenvoi', label: 'SMSenvoi' },
    { value: 'simulation', label: 'Simulation' },
    { value: 'custom', label: 'Custom' },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading SMS providers...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              SMS Providers
            </CardTitle>
            <CardDescription>
              Manage SMS gateway providers and their configurations
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add SMS Provider</DialogTitle>
                <DialogDescription>
                  Configure a new SMS gateway provider
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Internal Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., twilio-main"
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name *</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="e.g., Twilio Main Account"
                    />
                    {errors.displayName && <p className="text-sm text-red-500">{errors.displayName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider Type *</Label>
                    <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.provider && <p className="text-sm text-red-500">{errors.provider}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Gateway Type</Label>
                    <Select value={formData.type} onValueChange={(value: 'one-way' | 'two-way') => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-way">One-way (Send Only)</SelectItem>
                        <SelectItem value="two-way">Two-way (Send & Receive)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiEndpoint">API Endpoint (optional)</Label>
                  <Input
                    id="apiEndpoint"
                    value={formData.apiEndpoint}
                    onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                    placeholder="https://api.example.com/v1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key *</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="Your API key"
                    />
                    {errors.apiKey && <p className="text-sm text-red-500">{errors.apiKey}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">API Secret (optional)</Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      placeholder="Your API secret"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Rate Limits</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="messagesPerSecond" className="text-sm">Per Second</Label>
                      <Input
                        id="messagesPerSecond"
                        type="number"
                        value={formData.messagesPerSecond}
                        onChange={(e) => setFormData({ ...formData, messagesPerSecond: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="messagesPerMinute" className="text-sm">Per Minute</Label>
                      <Input
                        id="messagesPerMinute"
                        type="number"
                        value={formData.messagesPerMinute}
                        onChange={(e) => setFormData({ ...formData, messagesPerMinute: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="messagesPerHour" className="text-sm">Per Hour</Label>
                      <Input
                        id="messagesPerHour"
                        type="number"
                        value={formData.messagesPerHour}
                        onChange={(e) => setFormData({ ...formData, messagesPerHour: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settings">Additional Settings (JSON)</Label>
                  <Textarea
                    id="settings"
                    value={formData.settings}
                    onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
                    placeholder='{"timeout": 30, "retries": 3}'
                    rows={4}
                  />
                  {errors.settings && <p className="text-sm text-red-500">{errors.settings}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL (optional)</Label>
                  <Input
                    id="webhookUrl"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://your-domain.com/webhooks/sms"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportedCountries">Supported Countries (optional)</Label>
                  <CountryMultiSelect
                    values={formData.supportedCountries}
                    onValuesChange={(countries) => setFormData({ ...formData, supportedCountries: countries })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Provider'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit SMS Provider</DialogTitle>
                <DialogDescription>
                  Update SMS gateway provider configuration. Leave sensitive fields blank to keep current values.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Internal Name *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., twilio-main"
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-displayName">Display Name *</Label>
                    <Input
                      id="edit-displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="e.g., Twilio Main Account"
                    />
                    {errors.displayName && <p className="text-sm text-red-500">{errors.displayName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-provider">Provider Type *</Label>
                    <Select value={formData.provider} onValueChange={(value) => setFormData({ ...formData, provider: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.provider && <p className="text-sm text-red-500">{errors.provider}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-type">Gateway Type</Label>
                    <Select value={formData.type} onValueChange={(value: 'one-way' | 'two-way') => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-way">One-way (Send Only)</SelectItem>
                        <SelectItem value="two-way">Two-way (Send & Receive)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-apiEndpoint">API Endpoint (optional)</Label>
                  <Input
                    id="edit-apiEndpoint"
                    value={formData.apiEndpoint}
                    onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                    placeholder="https://api.example.com/v1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-apiKey">API Key</Label>
                    <Input
                      id="edit-apiKey"
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="Leave empty to keep current key"
                    />
                    {errors.apiKey && <p className="text-sm text-red-500">{errors.apiKey}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-apiSecret">API Secret (optional)</Label>
                    <Input
                      id="edit-apiSecret"
                      type="password"
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      placeholder="Leave empty to keep current secret"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Rate Limits</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="edit-messagesPerSecond" className="text-sm">Per Second</Label>
                      <Input
                        id="edit-messagesPerSecond"
                        type="number"
                        value={formData.messagesPerSecond}
                        onChange={(e) => setFormData({ ...formData, messagesPerSecond: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-messagesPerMinute" className="text-sm">Per Minute</Label>
                      <Input
                        id="edit-messagesPerMinute"
                        type="number"
                        value={formData.messagesPerMinute}
                        onChange={(e) => setFormData({ ...formData, messagesPerMinute: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-messagesPerHour" className="text-sm">Per Hour</Label>
                      <Input
                        id="edit-messagesPerHour"
                        type="number"
                        value={formData.messagesPerHour}
                        onChange={(e) => setFormData({ ...formData, messagesPerHour: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-settings">Additional Settings (JSON)</Label>
                  <Textarea
                    id="edit-settings"
                    value={formData.settings}
                    onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
                    placeholder='{"timeout": 30, "retries": 3}'
                    rows={4}
                  />
                  {errors.settings && <p className="text-sm text-red-500">{errors.settings}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-webhookUrl">Webhook URL (optional)</Label>
                  <Input
                    id="edit-webhookUrl"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://your-domain.com/webhooks/sms"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-supportedCountries">Supported Countries (optional)</Label>
                  <CountryMultiSelect
                    values={formData.supportedCountries}
                    onValuesChange={(countries) => setFormData({ ...formData, supportedCountries: countries })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="edit-isActive">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Provider'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {providers.length === 0 ? (
          <div className="text-center py-12">
            <Database className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground mt-4">No SMS providers configured</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add your first SMS provider to get started
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Countries</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => (
                <TableRow key={provider._id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{provider.displayName}</div>
                      <div className="text-sm text-muted-foreground">{provider.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {provider.provider}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {provider.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(provider.isActive)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {provider.supportedCountries && provider.supportedCountries.length > 0 ? (
                        <span>{provider.supportedCountries.length} countries</span>
                      ) : (
                        <span className="text-muted-foreground">All countries</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={provider.isActive} 
                        onCheckedChange={() => handleToggleStatus(provider)}
                        title={provider.isActive ? 'Disable provider' : 'Enable provider'}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAssignUsers(provider)}
                        title="Assign to users"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(provider)}
                        title="Edit provider"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(provider)}
                        className="text-destructive hover:text-destructive"
                        title="Delete provider"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
        setIsAssignDialogOpen(open);
        if (!open) {
          setAssigningProvider(null);
          setSelectedUsers([]);
          setSelectedAssignments([]);
          setExistingAssignments([]);
        }
      }}>
        <DialogContent className="max-w-none w-[60vw] max-h-[85vh] overflow-hidden">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg">
              Assign <span className="text-primary">{assigningProvider?.displayName}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* User Selection Cards */}
            <div className="grid grid-cols-2 gap-4 h-52">
              {/* Available Users Card */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Available Users</span>
                    <Badge variant="secondary" className="text-xs h-5">
                      {users.filter(user => !existingAssignments.some(a => a.userId._id === user._id)).length}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleAssignAll}
                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  >
                    Assign All
                  </Button>
                </div>
                <div className="h-40 overflow-y-auto space-y-1">
                  {users
                    .filter(user => !existingAssignments.some(a => a.userId._id === user._id))
                    .map((user) => (
                      <div
                        key={user._id}
                        className={`p-2 rounded-md cursor-pointer transition-all duration-200 ${
                          selectedUsers.includes(user._id)
                            ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 shadow-sm'
                            : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                        }`}
                        onClick={() => {
                          setSelectedUsers(prev =>
                            prev.includes(user._id)
                              ? prev.filter(id => id !== user._id)
                              : [...prev, user._id]
                          );
                        }}
                        onDoubleClick={async () => {
                          // Double click to assign immediately
                          if (!assigningProvider) return;
                          
                          try {
                            const payload = {
                              userId: user._id,
                              providerId: assigningProvider._id,
                              priority: 100,
                              isActive: true
                            };

                            const response = await fetch('/api/admin/sms/user-assignments', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload)
                            });

                            if (response.ok) {
                              toast.success(`Assigned ${user.name} to provider`);
                              // Reload assignments
                              const assignmentsResponse = await fetch(`/api/admin/sms/user-assignments?providerId=${assigningProvider._id}`);
                              if (assignmentsResponse.ok) {
                                const data = await assignmentsResponse.json();
                                setExistingAssignments(data.assignments || []);
                              }
                            } else {
                              const errorData = await response.json();
                              toast.error(errorData.error || 'Failed to assign user');
                            }
                          } catch (error) {
                            toast.error('Failed to assign user');
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{user.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {user.onboarding?.companyName || 'No company'}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">{user.role}</Badge>
                        </div>
                      </div>
                    ))}
                  {users.filter(user => !existingAssignments.some(a => a.userId._id === user._id)).length === 0 && (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      All users are assigned
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Users Card */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Assigned Users</span>
                    <Badge variant="secondary" className="text-xs h-5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {existingAssignments.length}
                    </Badge>
                  </div>
                  {existingAssignments.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleUnassignAll}
                      className="h-6 px-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      Unassign All
                    </Button>
                  )}
                </div>
                <div className="h-40 overflow-y-auto space-y-1">
                  {existingAssignments.map((assignment) => (
                    <div
                      key={assignment._id}
                      className={`p-2 rounded-md cursor-pointer transition-all duration-200 ${
                        selectedAssignments.includes(assignment._id)
                          ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 shadow-sm'
                          : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-green-200 dark:border-green-800'
                      }`}
                      onClick={() => {
                        setSelectedAssignments(prev =>
                          prev.includes(assignment._id)
                            ? prev.filter(id => id !== assignment._id)
                            : [...prev, assignment._id]
                        );
                      }}
                      onDoubleClick={async () => {
                        // Double click to unassign immediately
                        try {
                          const response = await fetch(`/api/admin/sms/user-assignments/${assignment._id}`, {
                            method: 'DELETE'
                          });

                          if (response.ok) {
                            setExistingAssignments(prev => prev.filter(a => a._id !== assignment._id));
                            toast.success(`Unassigned ${assignment.userId.name} from provider`);
                          } else {
                            toast.error('Failed to remove assignment');
                          }
                        } catch (error) {
                          toast.error('Failed to remove assignment');
                        }
                      }}
                    >
                                              <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{assignment.userId.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {assignment.userId.onboarding?.companyName || 'No company'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className="text-xs">{assignment.userId.role}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAssignment(assignment._id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                    </div>
                  ))}
                  {existingAssignments.length === 0 && (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      No users assigned yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-4">
                {selectedUsers.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Selected to assign: <span className="font-medium text-blue-600">{selectedUsers.length}</span> users
                  </span>
                )}
                {selectedAssignments.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Selected to unassign: <span className="font-medium text-red-600">{selectedAssignments.length}</span> users
                  </span>
                )}
                {selectedUsers.length === 0 && selectedAssignments.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No users selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedAssignments.length > 0 && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleClearAssignmentSelection}
                      className="h-7 px-3 text-xs text-gray-600 hover:text-gray-800"
                    >
                      Clear Unassign Selection
                    </Button>
                    <Button 
                      onClick={handleUnassignSelected}
                      variant="destructive"
                      size="sm"
                      className="h-7 px-3 text-xs"
                    >
                      Unassign ({selectedAssignments.length})
                    </Button>
                  </>
                )}
                {selectedUsers.length > 0 && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleClearSelection}
                      className="h-7 px-3 text-xs text-gray-600 hover:text-gray-800"
                    >
                      Clear Assign Selection
                    </Button>
                    <Button 
                      onClick={handleCreateAssignments}
                      disabled={selectedUsers.length === 0}
                      className="h-7 px-3 text-xs"
                    >
                      Assign ({selectedUsers.length})
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button 
              variant="outline" 
              onClick={() => setIsAssignDialogOpen(false)}
              className="h-9 px-4"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAssignments}
              disabled={selectedUsers.length === 0}
              className="h-9 px-4"
            >
              Assign {selectedUsers.length > 0 && `${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 