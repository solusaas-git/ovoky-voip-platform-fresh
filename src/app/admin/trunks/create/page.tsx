'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Save, Loader2, AlertCircle, Eye, EyeOff, Plus, Trash2, Settings } from 'lucide-react';
import { CreateTrunkForm, CODEC_OPTIONS, DEFAULT_CODECS, CodecType } from '@/types/trunk';

interface User {
  _id: string;
  name?: string;
  email: string;
  company?: string;
  onboarding?: {
    companyName?: string;
  };
}

export default function CreateTrunkPage() {
  const router = useRouter();
  const [form, setForm] = useState<CreateTrunkForm>({
    name: '',
    username: '',
    password: '',
    domain: '',
    ipAddress: '',
    ipAddresses: [''],
    port: 5060,
    assignedTo: '',
    codecs: [...DEFAULT_CODECS],
    description: '',
    registrationRequired: true,
    authType: 'password',
    notes: '',
    maxSessions: '',
    maxCPS: '',
  });

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Clean up the form data
      const filteredIpAddresses = form.ipAddresses.filter(ip => ip.trim() !== '');
      
      // Send only the unified IP addresses array - no more duplication
      const { ipAddress: _unused, ...formWithoutIpAddress } = form;
      const formData = {
        ...formWithoutIpAddress,
        ipAddresses: filteredIpAddresses,
      };

      const response = await fetch('/api/admin/trunks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create trunk');
      }

      // Success - redirect to admin trunks page
      router.push('/admin/trunks');
    } catch (error) {
      console.error('Error creating trunk:', error);
      setError(error instanceof Error ? error.message : 'Failed to create trunk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodecChange = (codec: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      codecs: checked 
        ? [...prev.codecs, codec as CodecType]
        : prev.codecs.filter(c => c !== codec)
    }));
  };

  const addIpAddress = () => {
    setForm(prev => ({
      ...prev,
      ipAddresses: [...prev.ipAddresses, '']
    }));
  };

  const removeIpAddress = (index: number) => {
    setForm(prev => ({
      ...prev,
      ipAddresses: prev.ipAddresses.filter((_, i) => i !== index)
    }));
  };

  const updateIpAddress = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      ipAddresses: prev.ipAddresses.map((ip, i) => i === index ? value : ip)
    }));
  };

  const validateForm = () => {
    const validIpAddresses = form.ipAddresses.filter(ip => ip.trim() !== '').length > 0;
    const allIpsValid = form.ipAddresses.every(ip => 
      ip.trim() === '' || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip.trim())
    );
    
    return (
      form.name.trim() !== '' &&
      form.username.trim() !== '' &&
      form.password.trim() !== '' &&
      form.domain.trim() !== '' &&
      form.assignedTo.trim() !== '' &&
      form.codecs.length > 0 &&
      validIpAddresses &&
      allIpsValid
    );
  };

  return (
    <MainLayout>
      <PageLayout
        title="Create Trunk"
        description="Add a new SIP trunk to the system"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/admin' },
          { label: 'Trunks', href: '/admin/trunks' },
          { label: 'Create' }
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
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Main SIP Trunk"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assign to User *</Label>
                  <Select
                    value={form.assignedTo}
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this trunk"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

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
                    value={form.username}
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
                      value={form.password}
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
                  value={form.domain}
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
                  {form.ipAddresses.map((ip, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={ip}
                        onChange={(e) => updateIpAddress(index, e.target.value)}
                        placeholder={index === 0 ? "e.g. 192.168.1.100 (Primary)" : "e.g. 192.168.1.101"}
                        pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
                        className="flex-1"
                      />
                      {index === 0 && form.ipAddresses.length > 1 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Primary</div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeIpAddress(index)}
                          disabled={form.ipAddresses.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {/* Show add button if no IPs exist */}
                  {form.ipAddresses.length === 0 && (
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
                {form.ipAddresses.filter(ip => ip.trim() !== '').length === 0 && (
                  <p className="text-sm text-red-600">At least one IP address is required</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm(prev => ({ ...prev, port: parseInt(e.target.value) || 5060 }))}
                    min="1"
                    max="65535"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authType">Authentication Type</Label>
                  <Select
                    value={form.authType}
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
                  checked={form.registrationRequired}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, registrationRequired: !!checked }))}
                />
                <Label htmlFor="registrationRequired">Registration Required</Label>
              </div>
            </CardContent>
          </Card>

          {/* Account Capacity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Account Capacity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Capacity Management</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Set capacity limits for this trunk. Use "unlimited" to remove limits entirely.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxSessions">Max Sessions</Label>
                  <Input
                    id="maxSessions"
                    type="text"
                    value={form.maxSessions}
                    onChange={(e) => setForm(prev => ({ ...prev, maxSessions: e.target.value }))}
                    placeholder="e.g. 100 or unlimited"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum concurrent sessions allowed. Use "unlimited" for no limit.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCPS">Max CPS</Label>
                  <Input
                    id="maxCPS"
                    type="text"
                    value={form.maxCPS}
                    onChange={(e) => setForm(prev => ({ ...prev, maxCPS: e.target.value }))}
                    placeholder="e.g. 10 or unlimited"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum calls per second. Use "unlimited" for no limit.
                  </p>
                </div>
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
                      checked={form.codecs.includes(codec.value)}
                      onCheckedChange={(checked) => handleCodecChange(codec.value, !!checked)}
                    />
                    <Label htmlFor={`codec-${codec.value}`} className="text-sm">
                      <div className="font-medium">{codec.value}</div>
                      <div className="text-xs text-muted-foreground">{codec.description}</div>
                    </Label>
                  </div>
                ))}
              </div>
              {form.codecs.length === 0 && (
                <p className="text-sm text-red-600 mt-2">At least one codec must be selected</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
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
              disabled={!validateForm() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Trunk
                </>
              )}
            </Button>
          </div>
        </form>
      </PageLayout>
    </MainLayout>
  );
} 