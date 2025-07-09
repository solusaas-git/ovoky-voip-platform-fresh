'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Loader2, AlertCircle, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { UpdateTrunkForm, CODEC_OPTIONS, CodecType } from '@/types/trunk';
import { StatusWithAccountManagement } from '@/components/sippy/StatusWithAccountManagement';
import { useAccountParameters } from '@/hooks/useAccountParameters';

interface User {
  _id: string;
  name?: string;
  email: string;
  company?: string;
  onboarding?: {
    companyName?: string;
  };
}

interface Trunk {
  _id: string;
  name: string;
  username: string;
  password: string;
  domain: string;
  ipAddress?: string; // Optional for backward compatibility
  ipAddresses: string[]; // Primary field for IP addresses
  port?: number;
  codecs: CodecType[];
  assignedTo: string;
  assignedToUser?: {
    _id: string;
    name?: string;
    email: string;
    company?: string;
    onboarding?: {
      companyName?: string;
    };
    sippyAccountId?: number;
  };
  description?: string;
  registrationRequired?: boolean;
  authType?: 'password' | 'ip' | 'both';
  notes?: string;
}

export default function EditTrunkPage() {
  const router = useRouter();
  const params = useParams();
  const trunkId = params.id as string;

  const [form, setForm] = useState<UpdateTrunkForm>({});
  const [originalTrunk, setOriginalTrunk] = useState<Trunk | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Account parameters state
  const [maxSessions, setMaxSessions] = useState<string>('');
  const [maxCps, setMaxCps] = useState<string>('');
  const { updateParameters, isLoading: isUpdatingParams, error: paramsError } = useAccountParameters();

  useEffect(() => {
    if (trunkId) {
      fetchTrunk();
      fetchUsers();
    }
  }, [trunkId]);

  // Load current account parameters when trunk data is loaded
  useEffect(() => {
    const loadAccountParameters = async () => {
      if (originalTrunk?.assignedToUser?.sippyAccountId) {
        try {
          const response = await fetch(`/api/sippy/account/${originalTrunk.assignedToUser.sippyAccountId}/info`);
          if (response.ok) {
            const data = await response.json();
            const accountInfo = data.accountInfo;
            
            // Format values for display
            const formatValue = (value?: number | string) => {
              if (value === 'Unlimited' || value === 'unlimited' || value === 0 || value === -1) return 'Unlimited';
              return value?.toString() || '';
            };
            
            console.log('Loading account info:', accountInfo);
            console.log('Raw values - max_sessions:', accountInfo?.max_sessions, 'max_calls_per_second:', accountInfo?.max_calls_per_second);
            
            const formattedSessions = formatValue(accountInfo?.max_sessions);
            const formattedCps = formatValue(accountInfo?.max_calls_per_second);
            
            console.log('Formatted values - sessions:', formattedSessions, 'cps:', formattedCps);
            
            setMaxSessions(formattedSessions);
            setMaxCps(formattedCps);
          }
        } catch (error) {
          console.error('Error loading account parameters:', error);
        }
      }
    };

    loadAccountParameters();
  }, [originalTrunk]);

  const fetchTrunk = async () => {
    try {
      const response = await fetch(`/api/admin/trunks/${trunkId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Trunk not found');
        } else {
          throw new Error('Failed to fetch trunk details');
        }
        return;
      }

      const trunk = await response.json();
      setOriginalTrunk(trunk);
      
      // Initialize form with trunk data
      // Combine primary IP and additional IPs into a unified list for better UX
      const allCurrentIps: string[] = [];
      
      // Handle backward compatibility: if no ipAddresses but has ipAddress, use it
      if (trunk.ipAddresses && trunk.ipAddresses.length > 0) {
        // Modern format: use ipAddresses as primary source
        trunk.ipAddresses.forEach((ip: string) => {
          if (!allCurrentIps.includes(ip)) {
            allCurrentIps.push(ip);
          }
        });
      } else if (trunk.ipAddress) {
        // Legacy format: only ipAddress exists, add it to the list
        allCurrentIps.push(trunk.ipAddress);
      }
      
      // Ensure we have at least one IP
      if (allCurrentIps.length === 0 && trunk.ipAddress) {
        allCurrentIps.push(trunk.ipAddress);
      }
      
      setForm({
        name: trunk.name,
        username: trunk.username,
        password: trunk.password,
        domain: trunk.domain,
        ipAddress: trunk.ipAddress, // Keep for API compatibility
        ipAddresses: allCurrentIps, // Use unified list for form management
        port: trunk.port,
        codecs: trunk.codecs,
        assignedTo: trunk.assignedTo,
        description: trunk.description || '',
        registrationRequired: trunk.registrationRequired,
        authType: trunk.authType,
        notes: trunk.notes || '',
      });
    } catch (error) {
      console.error('Error fetching trunk:', error);
      setError('Failed to load trunk details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Filter out empty IP addresses from the unified list
      const filteredIpAddresses = (form.ipAddresses || []).filter(ip => ip.trim() !== '');
      
      // Ensure we have at least one IP address
      if (filteredIpAddresses.length === 0) {
        throw new Error('At least one IP address is required');
      }
      
      // Send only the unified IP addresses array - no more duplication
      const { ipAddress: _unused, ...formWithoutIpAddress } = form;
      const formData = {
        ...formWithoutIpAddress,
        ipAddresses: filteredIpAddresses, // Only send the unified IP list
      };

      const response = await fetch(`/api/admin/trunks/${trunkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update trunk');
      }

      // Update account parameters if there's a Sippy account and changes were made
      if (originalTrunk?.assignedToUser?.sippyAccountId) {
        const params: { max_sessions?: number | string; max_calls_per_second?: number | string } = {};
        
        // Get current values from the loaded data
        const getCurrentValue = async (field: 'max_sessions' | 'max_calls_per_second') => {
          try {
            const response = await fetch(`/api/sippy/account/${originalTrunk.assignedToUser!.sippyAccountId}/info`);
            if (response.ok) {
              const data = await response.json();
              const value = data.accountInfo?.[field];
              const formatValue = (val?: number | string) => {
                if (val === 'Unlimited' || val === 'unlimited' || val === 0 || val === -1) return 'Unlimited';
                return val?.toString() || '';
              };
              return formatValue(value);
            }
          } catch (error) {
            console.error('Error getting current value:', error);
          }
          return '';
        };
        
        // Only update if the value has actually changed
        const currentMaxSessions = await getCurrentValue('max_sessions');
        const currentMaxCps = await getCurrentValue('max_calls_per_second');
        
        console.log('Frontend values - maxSessions:', maxSessions, 'currentMaxSessions:', currentMaxSessions);
        console.log('Frontend values - maxCps:', maxCps, 'currentMaxCps:', currentMaxCps);
        
        if (maxSessions && maxSessions.trim() !== '' && maxSessions !== currentMaxSessions) {
          console.log('Max Sessions changed, updating...');
          if (maxSessions.toLowerCase() === 'unlimited') {
            params.max_sessions = -1; // Sippy API expects -1 for unlimited
          } else {
            const numValue = parseInt(maxSessions);
            if (!isNaN(numValue)) {
              params.max_sessions = numValue;
            }
          }
        }
        
        if (maxCps && maxCps.trim() !== '' && maxCps !== currentMaxCps) {
          console.log('Max CPS changed - input:', maxCps, 'current:', currentMaxCps);
          if (maxCps.toLowerCase() === 'unlimited') {
            params.max_calls_per_second = 'unlimited'; // SippyClient will convert to -1 for API
            console.log('Setting max_calls_per_second to "unlimited"');
          } else {
            const numValue = parseFloat(maxCps);
            if (!isNaN(numValue)) {
              params.max_calls_per_second = numValue;
              console.log('Setting max_calls_per_second to number:', numValue);
            }
          }
        } else {
          console.log('Max CPS not updated - either empty, same as current, or not changed');
        }

        if (Object.keys(params).length > 0) {
  
          await updateParameters(originalTrunk.assignedToUser.sippyAccountId, params);
        }
      }

      // Success - redirect to trunk view page
      router.push(`/admin/trunks/${trunkId}`);
    } catch (error) {
      console.error('Error updating trunk:', error);
      setError(error instanceof Error ? error.message : 'Failed to update trunk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodecChange = (codec: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      codecs: checked 
        ? [...(prev.codecs || []), codec as CodecType]
        : (prev.codecs || []).filter(c => c !== codec)
    }));
  };

  const addIpAddress = () => {
    setForm(prev => ({
      ...prev,
      ipAddresses: [...(prev.ipAddresses || []), '']
    }));
  };

  const removeIpAddress = (index: number) => {
    setForm(prev => ({
      ...prev,
      ipAddresses: (prev.ipAddresses || []).filter((_, i) => i !== index)
    }));
  };

  const updateIpAddress = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      ipAddresses: (prev.ipAddresses || []).map((ip, i) => i === index ? value : ip)
    }));
  };

  const validateForm = () => {
    // Validate all IP addresses in the unified list
    const validIps = (form.ipAddresses || []).filter(ip => ip.trim() !== '');
    const allIpsValid = (form.ipAddresses || []).every(ip => 
      ip.trim() === '' || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip.trim())
    );
    
    // Must have at least one valid IP address
    const hasAtLeastOneIp = validIps.length > 0;
    
    return (
      form.name?.trim() !== '' &&
      form.username?.trim() !== '' &&
      form.password?.trim() !== '' &&
      form.domain?.trim() !== '' &&
      form.assignedTo?.trim() !== '' &&
      form.codecs && form.codecs.length > 0 &&
      hasAtLeastOneIp &&
      allIpsValid
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageLayout
          title="Loading..."
          description="Loading trunk details"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin', href: '/admin' },
            { label: 'Trunks', href: '/admin/trunks' },
            { label: 'Edit' }
          ]}
        >
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </PageLayout>
      </MainLayout>
    );
  }

  if (error || !originalTrunk) {
    return (
      <MainLayout>
        <PageLayout
          title="Error"
          description="Failed to load trunk details"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin', href: '/admin' },
            { label: 'Trunks', href: '/admin/trunks' },
            { label: 'Edit' }
          ]}
          headerActions={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          }
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Trunk not found'}</AlertDescription>
          </Alert>
        </PageLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageLayout
        title={`Edit ${originalTrunk.name}`}
        description="Update trunk configuration and settings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/admin' },
          { label: 'Trunks', href: '/admin/trunks' },
          { label: originalTrunk.name, href: `/admin/trunks/${trunkId}` },
          { label: 'Edit' }
        ]}
        headerActions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {paramsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Account Parameters Error: {paramsError}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Trunk Name *</Label>
                  <Input
                    id="name"
                    value={form.name || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Main SIP Trunk"
                    required
                  />
                </div>
                                {originalTrunk?.assignedToUser?.sippyAccountId && (
                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <StatusWithAccountManagement 
                      accountId={originalTrunk.assignedToUser.sippyAccountId}
                      onRefresh={fetchTrunk}
                    />
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this trunk"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Capacity */}
          {originalTrunk?.assignedToUser?.sippyAccountId && (
            <Card>
              <CardHeader>
                <CardTitle>Capacity Limits</CardTitle>
                <Badge variant="outline">Account #{originalTrunk.assignedToUser.sippyAccountId}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {paramsError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Error updating parameters: {paramsError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxSessions">
                      Max Sessions
                      <span className="text-sm text-muted-foreground ml-1">(number or &quot;Unlimited&quot;)</span>
                    </Label>
                    <Input
                      id="maxSessions"
                      type="text"
                      value={maxSessions}
                      onChange={(e) => setMaxSessions(e.target.value)}
                      placeholder="e.g. 100 or Unlimited"
                      disabled={isUpdatingParams}
                    />

                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxCps">
                      Max CPS (Calls Per Second)
                      <span className="text-sm text-muted-foreground ml-1">(number or &quot;Unlimited&quot;)</span>
                    </Label>
                    <Input
                      id="maxCps"
                      type="text"
                      value={maxCps}
                      onChange={(e) => setMaxCps(e.target.value)}
                      placeholder="e.g. 10.0 or Unlimited"
                      disabled={isUpdatingParams}
                    />

                  </div>
                </div>
                

              </CardContent>
            </Card>
          )}

          {/* Connection Details */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={form.username || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="SIP username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="SIP password"
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Domain *</Label>
                <Input
                  id="domain"
                  value={form.domain || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="e.g. sip.provider.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>IP Addresses *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addIpAddress}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add IP
                  </Button>
                </div>
                <div className="space-y-2">
                  {/* Unified IP Address List */}
                  {(form.ipAddresses || []).map((ip, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={ip}
                        onChange={(e) => updateIpAddress(index, e.target.value)}
                        placeholder={index === 0 ? "e.g. 192.168.1.100 (Primary)" : "e.g. 192.168.1.101"}
                        pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
                        className="flex-1"
                      />
                      {index === 0 && (form.ipAddresses || []).length > 1 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Primary</div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeIpAddress(index)}
                          disabled={(form.ipAddresses || []).length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {/* Show add button if no IPs exist */}
                  {(!form.ipAddresses || form.ipAddresses.length === 0) && (
                    <div className="flex gap-2">
                      <Input
                        value=""
                        onChange={(e) => {
                          setForm(prev => ({
                            ...prev,
                            ipAddresses: [e.target.value]
                          }));
                        }}
                        placeholder="e.g. 192.168.1.100 (Primary)"
                        pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
                        className="flex-1"
                      />
                      <div className="px-3 py-2 text-sm text-muted-foreground">Primary</div>
                    </div>
                  )}
                </div>
                {(!form.ipAddresses || form.ipAddresses.filter(ip => ip.trim() !== '').length === 0) && (
                  <p className="text-sm text-red-600">At least one IP address is required</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={form.port || 5060}
                    onChange={(e) => setForm(prev => ({ ...prev, port: parseInt(e.target.value) || 5060 }))}
                    min="1"
                    max="65535"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authType">Authentication Type</Label>
                  <Select
                    value={form.authType || 'password'}
                    onValueChange={(value: 'password' | 'ip' | 'both') => setForm(prev => ({ ...prev, authType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="password">Password</SelectItem>
                      <SelectItem value="ip">IP Authentication</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="registrationRequired"
                  checked={form.registrationRequired ?? true}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, registrationRequired: !!checked }))}
                />
                <Label htmlFor="registrationRequired">Registration Required</Label>
              </div>
            </CardContent>
          </Card>

          {/* Codecs */}
          <Card>
            <CardHeader>
              <CardTitle>Supported Codecs *</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CODEC_OPTIONS.map((codec) => (
                  <div key={codec.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`codec-${codec.value}`}
                      checked={(form.codecs || []).includes(codec.value)}
                      onCheckedChange={(checked) => handleCodecChange(codec.value, !!checked)}
                    />
                    <Label htmlFor={`codec-${codec.value}`} className="text-sm">
                      <div className="font-medium">{codec.value}</div>
                      <div className="text-xs text-muted-foreground">{codec.description}</div>
                    </Label>
                  </div>
                ))}
              </div>
              {(!form.codecs || form.codecs.length === 0) && (
                <p className="text-sm text-red-600 mt-2">At least one codec must be selected</p>
              )}
            </CardContent>
          </Card>

          {/* Assignment Information */}
          <Card>
            <CardHeader>
              <CardTitle>User Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign to User *</Label>
                <Select
                  value={form.assignedTo || ''}
                  onValueChange={(value) => setForm(prev => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.name || user.email} ({user.onboarding?.companyName || user.company || user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {originalTrunk.assignedToUser && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Previous Assignment</h4>
                  <p className="text-sm text-yellow-800">
                    Previously assigned to: <strong>{originalTrunk.assignedToUser.name || originalTrunk.assignedToUser.email}</strong>
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Changing the assignment will update the trunk&apos;s assigned user.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Internal notes for admins (not visible to users)"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!validateForm() || isSubmitting || isUpdatingParams}
            >
              {(isSubmitting || isUpdatingParams) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUpdatingParams ? 'Updating Account...' : 'Updating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </PageLayout>
    </MainLayout>
  );
} 