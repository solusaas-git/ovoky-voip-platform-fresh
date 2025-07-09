'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { ICountry } from '@/models/Country';
import { IProvider, ProviderService } from '@/models/Provider';

interface Country extends Omit<ICountry, '_id'> {
  _id: string;
}

interface Provider extends Omit<IProvider, '_id'> {
  _id: string;
}

const PROVIDER_SERVICES: { value: ProviderService; label: string }[] = [
  { value: 'outbound_calls', label: 'Outbound Calls' },
  { value: 'inbound_calls', label: 'Inbound Calls' },
  { value: 'did_numbers', label: 'DID Numbers (SDA)' },
  { value: 'sms', label: 'SMS Services' },
  { value: 'emailing', label: 'Email Marketing' },
  { value: 'whatsapp_business', label: 'WhatsApp Business API' },
  { value: 'other', label: 'Other Services' }
];

export function DataSettings() {
  const [activeTab, setActiveTab] = useState('countries');
  
  // Countries state
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [countryForm, setCountryForm] = useState({
    name: '',
    code: '',
    phoneCode: '',
    isActive: true
  });
  
  // Providers state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [providerForm, setProviderForm] = useState({
    name: '',
    description: '',
    services: [] as ProviderService[],
    website: '',
    contactEmail: '',
    contactPhone: '',
    isActive: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCountries();
    fetchProviders();
  }, []);

  const fetchCountries = async () => {
    try {
      setCountriesLoading(true);
      const response = await fetch('/api/admin/countries?limit=500');
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast.error('Failed to load countries');
    } finally {
      setCountriesLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      setProvidersLoading(true);
      const response = await fetch('/api/admin/providers?limit=500');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load providers');
    } finally {
      setProvidersLoading(false);
    }
  };

  const handleCountrySubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const url = editingCountry 
        ? `/api/admin/countries/${editingCountry._id}`
        : '/api/admin/countries';
      
      const method = editingCountry ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(countryForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save country');
      }

      toast.success(`Country ${editingCountry ? 'updated' : 'created'} successfully`);
      setShowCountryModal(false);
      resetCountryForm();
      fetchCountries();
    } catch (error) {
      console.error('Error saving country:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save country');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProviderSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const url = editingProvider 
        ? `/api/admin/providers/${editingProvider._id}`
        : '/api/admin/providers';
      
      const method = editingProvider ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save provider');
      }

      toast.success(`Provider ${editingProvider ? 'updated' : 'created'} successfully`);
      setShowProviderModal(false);
      resetProviderForm();
      fetchProviders();
    } catch (error) {
      console.error('Error saving provider:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save provider');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCountry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this country?')) return;
    
    try {
      const response = await fetch(`/api/admin/countries/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete country');
      }

      toast.success('Country deleted successfully');
      fetchCountries();
    } catch (error) {
      console.error('Error deleting country:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete country');
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;
    
    try {
      const response = await fetch(`/api/admin/providers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete provider');
      }

      toast.success('Provider deleted successfully');
      fetchProviders();
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete provider');
    }
  };

  const resetCountryForm = () => {
    setCountryForm({
      name: '',
      code: '',
      phoneCode: '',
      isActive: true
    });
    setEditingCountry(null);
  };

  const resetProviderForm = () => {
    setProviderForm({
      name: '',
      description: '',
      services: [],
      website: '',
      contactEmail: '',
      contactPhone: '',
      isActive: true
    });
    setEditingProvider(null);
  };

  const openEditCountry = (country: Country) => {
    setEditingCountry(country);
    setCountryForm({
      name: country.name,
      code: country.code,
      phoneCode: country.phoneCode,
      isActive: country.isActive
    });
    setShowCountryModal(true);
  };

  const openEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
    setProviderForm({
      name: provider.name,
      description: provider.description || '',
      services: provider.services,
      website: provider.website || '',
      contactEmail: provider.contactEmail || '',
      contactPhone: provider.contactPhone || '',
      isActive: provider.isActive
    });
    setShowProviderModal(true);
  };

  const filteredCountries = countries
    .filter(country =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.phoneCode.includes(searchTerm)
    )
    .sort((a, b) => {
      // Sort by active status first (active countries first)
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      // Then sort by name alphabetically
      return a.name.localeCompare(b.name);
    });

  const filteredProviders = providers
    .filter(provider =>
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by active status first (active providers first)
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      // Then sort by name alphabetically
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Data Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage predefined countries and providers for phone number management.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
        </TabsList>

        {/* Countries Tab */}
        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Countries</CardTitle>
                  <CardDescription>
                    Manage predefined countries for phone number management
                  </CardDescription>
                </div>
                <Dialog open={showCountryModal} onOpenChange={setShowCountryModal}>
                  <DialogTrigger asChild>
                    <Button onClick={resetCountryForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Country
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search countries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {countriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Phone Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCountries.map((country) => (
                      <TableRow key={country._id}>
                        <TableCell className="font-medium">{country.name}</TableCell>
                        <TableCell>{country.code}</TableCell>
                        <TableCell>+{country.phoneCode}</TableCell>
                        <TableCell>
                          <Badge variant={country.isActive ? 'default' : 'secondary'}>
                            {country.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditCountry(country)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCountry(country._id)}
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
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Providers</CardTitle>
                  <CardDescription>
                    Manage service providers and their capabilities
                  </CardDescription>
                </div>
                <Dialog open={showProviderModal} onOpenChange={setShowProviderModal}>
                  <DialogTrigger asChild>
                    <Button onClick={resetProviderForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Provider
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search providers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {providersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProviders.map((provider) => (
                      <TableRow key={provider._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            {provider.description && (
                              <div className="text-sm text-muted-foreground">{provider.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {provider.services.map((service) => (
                              <Badge key={service} variant="outline" className="text-xs">
                                {PROVIDER_SERVICES.find(s => s.value === service)?.label || service}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            {provider.contactEmail && (
                              <div>{provider.contactEmail}</div>
                            )}
                            {provider.contactPhone && (
                              <div>{provider.contactPhone}</div>
                            )}
                            {provider.website && (
                              <div>{provider.website}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                            {provider.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditProvider(provider)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProvider(provider._id)}
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
          </Card>
        </TabsContent>
      </Tabs>

      {/* Country Modal */}
      <Dialog open={showCountryModal} onOpenChange={setShowCountryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCountry ? 'Edit Country' : 'Add New Country'}
            </DialogTitle>
            <DialogDescription>
              {editingCountry ? 'Update country information' : 'Add a new country to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="countryName">Country Name *</Label>
              <Input
                id="countryName"
                value={countryForm.name}
                onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })}
                placeholder="United States"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="countryCode">Country Code *</Label>
              <Input
                id="countryCode"
                value={countryForm.code}
                onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })}
                placeholder="US"
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneCode">Phone Code *</Label>
              <Input
                id="phoneCode"
                value={countryForm.phoneCode}
                onChange={(e) => setCountryForm({ ...countryForm, phoneCode: e.target.value })}
                placeholder="1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="countryActive"
                checked={countryForm.isActive}
                onCheckedChange={(checked) => setCountryForm({ ...countryForm, isActive: !!checked })}
              />
              <Label htmlFor="countryActive">Active</Label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowCountryModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCountrySubmit}
              disabled={isSubmitting || !countryForm.name || !countryForm.code || !countryForm.phoneCode}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingCountry ? 'Update Country' : 'Add Country'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Provider Modal */}
      <Dialog open={showProviderModal} onOpenChange={setShowProviderModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? 'Edit Provider' : 'Add New Provider'}
            </DialogTitle>
            <DialogDescription>
              {editingProvider ? 'Update provider information' : 'Add a new service provider to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="providerName">Provider Name *</Label>
                <Input
                  id="providerName"
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                  placeholder="Acme Telecom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="providerWebsite">Website</Label>
                <Input
                  id="providerWebsite"
                  value={providerForm.website}
                  onChange={(e) => setProviderForm({ ...providerForm, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerDescription">Description</Label>
              <Textarea
                id="providerDescription"
                value={providerForm.description}
                onChange={(e) => setProviderForm({ ...providerForm, description: e.target.value })}
                placeholder="Provider description..."
                rows={2}
              />
            </div>
            <div className="space-y-3">
              <Label>Services *</Label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDER_SERVICES.map((service) => (
                  <div key={service.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={service.value}
                      checked={providerForm.services.includes(service.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setProviderForm({
                            ...providerForm,
                            services: [...providerForm.services, service.value]
                          });
                        } else {
                          setProviderForm({
                            ...providerForm,
                            services: providerForm.services.filter(s => s !== service.value)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={service.value} className="text-sm">{service.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="providerEmail">Contact Email</Label>
                <Input
                  id="providerEmail"
                  type="email"
                  value={providerForm.contactEmail}
                  onChange={(e) => setProviderForm({ ...providerForm, contactEmail: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="providerPhone">Contact Phone</Label>
                <Input
                  id="providerPhone"
                  value={providerForm.contactPhone}
                  onChange={(e) => setProviderForm({ ...providerForm, contactPhone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="providerActive"
                checked={providerForm.isActive}
                onCheckedChange={(checked) => setProviderForm({ ...providerForm, isActive: !!checked })}
              />
              <Label htmlFor="providerActive">Active</Label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowProviderModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProviderSubmit}
              disabled={isSubmitting || !providerForm.name || providerForm.services.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingProvider ? 'Update Provider' : 'Add Provider'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 