'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CreditCard, 
  Plus, 
  Settings, 
  Trash2, 
  Edit3, 
  Loader2, 
  Shield,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useBranding } from '@/hooks/useBranding';
import { IPaymentGateway } from '@/models/PaymentGateway';

interface PaymentGatewayFormData {
  name: string;
  provider: 'stripe' | 'paypal' | 'square' | 'razorpay';
  configuration: {
    publishableKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    clientId?: string;
    clientSecret?: string;
    applicationId?: string;
    accessToken?: string;
    keyId?: string;
    keySecret?: string;
  };
  settings: {
    allowedCurrencies: string[];
    minimumAmount: number;
    maximumAmount: number;
    processingFee: number;
    fixedFee: number;
  };
  isActive: boolean;
}

const PROVIDER_CONFIGS = {
  stripe: {
    name: 'Stripe',
    icon: '💳',
    description: 'Accept credit cards, bank transfers, and more',
    fields: [
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', required: true, public: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, public: false },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false, public: false }
    ]
  },
  paypal: {
    name: 'PayPal',
    icon: '🅿️',
    description: 'Accept PayPal payments and credit cards',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true, public: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, public: false }
    ]
  },
  square: {
    name: 'Square',
    icon: '⬜',
    description: 'Accept payments with Square',
    fields: [
      { key: 'applicationId', label: 'Application ID', type: 'text', required: true, public: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true, public: false }
    ]
  },
  razorpay: {
    name: 'Razorpay',
    icon: '🇮🇳',
    description: 'Accept payments in India with Razorpay',
    fields: [
      { key: 'keyId', label: 'Key ID', type: 'text', required: true, public: true },
      { key: 'keySecret', label: 'Key Secret', type: 'password', required: true, public: false }
    ]
  }
};

const CURRENCY_OPTIONS = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'INR'
];

export function PaymentGatewaySettings() {
  const { colors } = useBranding();
  const [gateways, setGateways] = useState<IPaymentGateway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGateway, setEditingGateway] = useState<IPaymentGateway | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<PaymentGatewayFormData>({
    name: '',
    provider: 'stripe',
    configuration: {},
    settings: {
      allowedCurrencies: ['USD'],
      minimumAmount: 10,
      maximumAmount: 10000,
      processingFee: 2.9,
      fixedFee: 0.30
    },
    isActive: false
  });

  const fetchGateways = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/payment-gateways');
      if (!response.ok) throw new Error('Failed to fetch gateways');
      
      const data = await response.json();
      setGateways(data.gateways || []);
    } catch (error) {
      console.error('Error fetching payment gateways:', error);
      toast.error('Failed to load payment gateways');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'stripe',
      configuration: {},
      settings: {
        allowedCurrencies: ['USD'],
        minimumAmount: 10,
        maximumAmount: 10000,
        processingFee: 2.9,
        fixedFee: 0.30
      },
      isActive: false
    });
    setEditingGateway(null);
  };

  const handleEdit = (gateway: IPaymentGateway) => {
    setEditingGateway(gateway);
    setFormData({
      name: gateway.name,
      provider: gateway.provider,
      configuration: gateway.configuration,
      settings: gateway.settings,
      isActive: gateway.isActive
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingGateway 
        ? `/api/payment-gateways/${editingGateway._id}`
        : '/api/payment-gateways';
      
      const method = editingGateway ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save gateway');
      }

      const result = await response.json();
      toast.success(result.message);
      
      setShowDialog(false);
      resetForm();
      fetchGateways();
    } catch (error) {
      console.error('Error saving gateway:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save gateway');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment gateway?')) {
      return;
    }

    try {
      const response = await fetch(`/api/payment-gateways/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete gateway');
      }

      toast.success('Payment gateway deleted successfully');
      fetchGateways();
    } catch (error) {
      console.error('Error deleting gateway:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete gateway');
    }
  };

  const toggleSecret = (fieldKey: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const renderConfigurationFields = () => {
    const config = PROVIDER_CONFIGS[formData.provider];
    
    return config.fields.map(field => (
      <div key={field.key} className="space-y-2">
        <Label className="flex items-center gap-2">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
          {!field.public && <Shield className="h-3 w-3 text-amber-500" />}
        </Label>
        <div className="relative">
          <Input
            type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
            value={formData.configuration[field.key as keyof typeof formData.configuration] || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              configuration: {
                ...prev.configuration,
                [field.key]: e.target.value
              }
            }))}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
          {field.type === 'password' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => toggleSecret(field.key)}
            >
              {showSecrets[field.key] ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
        {!field.public && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            This field will be encrypted and hidden
          </p>
        )}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payment Gateways</h3>
          <p className="text-sm text-muted-foreground">
            Configure payment processors for balance top-ups
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2" style={{ backgroundColor: colors.primary }}>
              <Plus className="h-4 w-4" />
              Add Gateway
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGateway ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
              </DialogTitle>
              <DialogDescription>
                Configure a payment processor to accept balance top-ups from users.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gateway Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Stripe Gateway"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provider *</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      provider: value as any,
                      configuration: {} // Reset configuration when provider changes
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span>{config.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {PROVIDER_CONFIGS[formData.provider].name} Configuration
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {renderConfigurationFields()}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment Settings
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.settings.minimumAmount}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, minimumAmount: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.settings.maximumAmount}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, maximumAmount: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Processing Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.settings.processingFee}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, processingFee: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fixed Fee ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.settings.fixedFee}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, fixedFee: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Allowed Currencies</Label>
                  <div className="flex flex-wrap gap-2">
                    {CURRENCY_OPTIONS.map(currency => (
                      <label key={currency} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.settings.allowedCurrencies.includes(currency)}
                          onChange={(e) => {
                            const currencies = e.target.checked
                              ? [...formData.settings.allowedCurrencies, currency]
                              : formData.settings.allowedCurrencies.filter(c => c !== currency);
                            setFormData(prev => ({
                              ...prev,
                              settings: { ...prev.settings, allowedCurrencies: currencies }
                            }));
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{currency}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="active">Active Gateway</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" style={{ backgroundColor: colors.primary }}>
                  {editingGateway ? 'Update Gateway' : 'Create Gateway'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {gateways.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div 
                className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <CreditCard className="h-8 w-8" style={{ color: colors.primary }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Payment Gateways</h3>
                <p className="text-muted-foreground">
                  Add a payment gateway to enable balance top-ups for users.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Settings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gateways.map((gateway) => {
                  const config = PROVIDER_CONFIGS[gateway.provider];
                  return (
                    <TableRow key={gateway._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{gateway.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Created {new Date(gateway.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{config.icon}</span>
                          <span>{config.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {gateway.isActive ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>Min: {gateway.settings.minimumAmount}</div>
                          <div>Max: {gateway.settings.maximumAmount}</div>
                          <div>Fee: {gateway.settings.processingFee}% + {gateway.settings.fixedFee}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(gateway)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(gateway._id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 