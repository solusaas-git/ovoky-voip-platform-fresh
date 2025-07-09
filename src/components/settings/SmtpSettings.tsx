'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Mail, Send, CheckCircle, XCircle, Plus, Edit, Trash2, DollarSign, Lock, HeadphonesIcon, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ISmtpSettings, SmtpTestResult, EmailCategory, EMAIL_CATEGORY_DESCRIPTIONS, EMAIL_CATEGORY_EXAMPLES } from '@/types/smtp';

const CATEGORY_ICONS = {
  billing: DollarSign,
  authentication: Lock,
  support: HeadphonesIcon,
  default: Settings
} as const;

const CATEGORY_COLORS = {
  billing: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  authentication: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  support: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
} as const;

interface SmtpAccountFormData {
  id?: string;
  _id?: string;
  name: string;
  category: EmailCategory;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
  isDefault: boolean;
  priority: number;
  description: string;
}

export function SmtpSettings() {
  const [accounts, setAccounts] = useState<ISmtpSettings[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<SmtpTestResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory>('billing');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SmtpAccountFormData | null>(null);
  const [formData, setFormData] = useState<SmtpAccountFormData>({
    name: '',
    category: 'billing',
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    enabled: true,
    isDefault: false,
    priority: 0,
    description: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/smtp');
      if (response.ok) {
        const data = await response.json();
        setAccounts(Array.isArray(data) ? data : data ? [data] : []);
      }
    } catch (error) {
      console.error('Error fetching SMTP accounts:', error);
      toast.error('Failed to load SMTP accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: selectedCategory,
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      fromEmail: '',
      fromName: '',
      enabled: true,
      isDefault: false,
      priority: 0,
      description: ''
    });
    setEditingAccount(null);
  };

  const openCreateDialog = (category: EmailCategory) => {
    setSelectedCategory(category);
    resetForm();
    setFormData(prev => ({ ...prev, category }));
    setIsDialogOpen(true);
  };

  const openEditDialog = (account: ISmtpSettings) => {
    const formDataAccount: SmtpAccountFormData = {
      id: (account._id as string) || '',
      _id: (account._id as string) || '',
      name: account.name || '',
      category: account.category || 'billing',
      host: account.host || '',
      port: account.port || 587,
      secure: account.secure || false,
      username: account.username || '',
      password: '', // Don't populate password for security
      fromEmail: account.fromEmail || '',
      fromName: account.fromName || '',
      enabled: account.enabled ?? true,
      isDefault: account.isDefault || false,
      priority: account.priority || 0,
      description: account.description || ''
    };
    setEditingAccount(formDataAccount);
    setFormData({
      id: (account._id as string) || '',
      name: account.name || '',
      category: account.category || 'billing',
      host: account.host || '',
      port: account.port || 587,
      secure: account.secure || false,
      username: account.username || '',
      password: '', // Don't populate password for security
      fromEmail: account.fromEmail || '',
      fromName: account.fromName || '',
      enabled: account.enabled ?? true,
      isDefault: account.isDefault || false,
      priority: account.priority || 0,
      description: account.description || ''
    });
    setSelectedCategory(account.category || 'billing');
    setIsDialogOpen(true);
  };

  const handleSaveAccount = async () => {
    try {
      setIsLoading(true);
      
      const method = editingAccount ? 'PUT' : 'POST';
      const url = editingAccount ? `/api/settings/smtp/${editingAccount._id}` : '/api/settings/smtp';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(`SMTP account ${editingAccount ? 'updated' : 'created'} successfully`);
        setIsDialogOpen(false);
        resetForm();
        fetchAccounts();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${editingAccount ? 'update' : 'create'} SMTP account`);
      }
    } catch (error) {
      console.error('Error saving SMTP account:', error);
      toast.error(`Failed to ${editingAccount ? 'update' : 'create'} SMTP account`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this SMTP account?')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/smtp/${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('SMTP account deleted successfully');
        fetchAccounts();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete SMTP account');
      }
    } catch (error) {
      console.error('Error deleting SMTP account:', error);
      toast.error('Failed to delete SMTP account');
    }
  };

  const handleTestAccount = async (account: ISmtpSettings) => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      
      const response = await fetch('/api/settings/smtp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: account._id,
          testEmail,
        }),
      });

      if (response.ok) {
        const result: SmtpTestResult = await response.json();
        setTestResult(result);
        
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to test SMTP account');
      }
    } catch (error) {
      console.error('Error testing SMTP:', error);
      toast.error('Failed to test SMTP account');
    } finally {
      setIsTesting(false);
    }
  };

  const getAccountsByCategory = (category: EmailCategory) => {
    return accounts.filter(account => account.category === category).sort((a, b) => a.priority - b.priority);
  };

  const CategoryIcon = ({ category }: { category: EmailCategory }) => {
    const Icon = CATEGORY_ICONS[category];
    return <Icon className="h-4 w-4" />;
  };

  const AccountCard = ({ account }: { account: ISmtpSettings }) => (
    <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CategoryIcon category={account.category} />
            <CardTitle className="text-base text-gray-900 dark:text-gray-100">{account.name}</CardTitle>
            {account.isDefault && (
              <Badge variant="secondary" className="text-xs">Default</Badge>
            )}
            {!account.enabled && (
              <Badge variant="destructive" className="text-xs">Disabled</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEditDialog(account)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteAccount(account._id as string)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {account.description && (
          <CardDescription className="text-sm text-muted-foreground">{account.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <div><strong>Host:</strong> {account.host}:{account.port}</div>
          <div><strong>From:</strong> {`${account.fromName} <${account.fromEmail}>`}</div>
          <div><strong>Security:</strong> {account.secure ? 'SSL/TLS' : 'None'}</div>
        </div>
        
        <div className="flex items-center gap-2 pt-2">
          <Input
            type="email"
            placeholder="test@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 h-8"
          />
          <Button
            onClick={() => handleTestAccount(account)}
            disabled={isTesting || !account.enabled}
            variant="outline"
            size="sm"
          >
            {isTesting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>

        {testResult && (
          <div className={`mt-2 p-2 rounded-md flex items-center space-x-2 text-xs ${
            testResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {testResult.success ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const CategoryTab = ({ category }: { category: EmailCategory }) => {
    const categoryAccounts = getAccountsByCategory(category);
    
    return (
      <TabsContent value={category} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize flex items-center gap-2">
              <CategoryIcon category={category} />
              {category} Emails
            </h3>
            <p className="text-sm text-muted-foreground">{EMAIL_CATEGORY_DESCRIPTIONS[category]}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {EMAIL_CATEGORY_EXAMPLES[category].map((example) => (
                <Badge key={example} variant="outline" className="text-xs">
                  {example}
                </Badge>
              ))}
            </div>
          </div>
          <Button onClick={() => openCreateDialog(category)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categoryAccounts.length === 0 ? (
            <div className="col-span-full text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <CategoryIcon category={category} />
              <Mail className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500 mb-2 mt-2" />
              <p className="text-sm text-muted-foreground mb-4">No {category} SMTP accounts configured</p>
              <Button onClick={() => openCreateDialog(category)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Account
              </Button>
            </div>
          ) : (
            categoryAccounts.map((account) => (
              <AccountCard key={account._id as string} account={account} />
            ))
          )}
        </div>
      </TabsContent>
    );
  };

  if (isLoading && accounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>SMTP Configuration</span>
          </CardTitle>
          <CardDescription>
            Manage multiple SMTP accounts for different types of email notifications. Each category uses dedicated SMTP settings for better organization and deliverability.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as EmailCategory)}>
        <TabsList className="grid w-full grid-cols-4">
          {(['billing', 'authentication', 'support', 'default'] as EmailCategory[]).map((category) => (
            <TabsTrigger key={category} value={category} className="flex items-center gap-2">
              <CategoryIcon category={category} />
              <span className="hidden sm:inline capitalize">{category}</span>
              <Badge className={`ml-1 ${CATEGORY_COLORS[category]}`}>
                {getAccountsByCategory(category).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {(['billing', 'authentication', 'support', 'default'] as EmailCategory[]).map((category) => (
          <CategoryTab key={category} category={category} />
        ))}
      </Tabs>

      {/* Create/Edit Account Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          // Reset form when dialog closes
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {editingAccount ? 'Edit SMTP Account' : 'Create SMTP Account'}
            </DialogTitle>
            <DialogDescription>
              Configure SMTP settings for {formData.category} email notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-900 dark:text-gray-100">Account Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Billing SMTP"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-gray-900 dark:text-gray-100">Email Category *</Label>
                <Select value={formData.category} onValueChange={(value: EmailCategory) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="default">Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SMTP Server Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host" className="text-gray-900 dark:text-gray-100">SMTP Host *</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="smtp.gmail.com"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port" className="text-gray-900 dark:text-gray-100">Port *</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                  placeholder="587"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>

            {/* Authentication */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-900 dark:text-gray-100">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="your-email@gmail.com"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-900 dark:text-gray-100">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingAccount ? "Leave blank to keep current" : "Enter password"}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>

            {/* From Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromEmail" className="text-gray-900 dark:text-gray-100">From Email *</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromEmail: e.target.value }))}
                  placeholder="billing@yourcompany.com"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromName" className="text-gray-900 dark:text-gray-100">From Name</Label>
                <Input
                  id="fromName"
                  value={formData.fromName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromName: e.target.value }))}
                  placeholder="Company Billing"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-gray-900 dark:text-gray-100">Use SSL/TLS</Label>
                  <p className="text-sm text-muted-foreground">Enable secure connection (recommended for port 465)</p>
                </div>
                <Switch
                  checked={formData.secure}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, secure: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-gray-900 dark:text-gray-100">Enabled</Label>
                  <p className="text-sm text-muted-foreground">Enable this SMTP account for sending emails</p>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-gray-900 dark:text-gray-100">Default Account</Label>
                  <p className="text-sm text-muted-foreground">Use as fallback when category-specific account is unavailable</p>
                </div>
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-900 dark:text-gray-100">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description for this SMTP account..."
                rows={3}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAccount} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingAccount ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingAccount ? 'Update Account' : 'Create Account'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 