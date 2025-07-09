'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountrySelector } from '@/components/ui/country-selector';
import { MultiCountrySelector } from '@/components/ui/multi-country-selector';
import { 
  Building2, 
  Phone, 
  Mail, 
  MessageCircle, 
  Plus, 
  X, 
  Save,
  BarChart3,
  Loader2,
  Edit,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { UserOnboarding, ContactMethod, ServiceInterest } from '@/models/UserOnboarding';
import { CountryData, COUNTRIES } from '@/data/countries';

interface AdminOnboardingFormProps {
  userId: string;
  existingData?: UserOnboarding | null;
  onSave: () => void;
}

const SERVICE_OPTIONS = [
  { 
    value: 'outbound_calls', 
    label: 'Outbound Calls', 
    icon: Phone, 
    needsCountries: true,
    description: 'Make calls to customers worldwide'
  },
  { 
    value: 'inbound_calls', 
    label: 'Inbound Calls', 
    icon: Phone, 
    needsCountries: true,
    description: 'Receive calls from customers'
  },
  { 
    value: 'did_numbers', 
    label: 'DID Numbers (SDA)', 
    icon: Phone, 
    needsCountries: true,
    description: 'Direct Inward Dialing numbers'
  },
  { 
    value: 'sms', 
    label: 'SMS Services', 
    icon: MessageCircle, 
    needsCountries: true,
    description: 'Send and receive text messages'
  },
  { 
    value: 'emailing', 
    label: 'Email Marketing', 
    icon: Mail, 
    needsCountries: false,
    description: 'Email campaigns and automation'
  },
  { 
    value: 'whatsapp_business', 
    label: 'WhatsApp Business API', 
    icon: MessageCircle, 
    needsCountries: true,
    description: 'WhatsApp business messaging'
  },
  { 
    value: 'other', 
    label: 'Other Services', 
    icon: Plus, 
    needsCountries: false,
    description: 'Custom communication solutions'
  },
];

const CONTACT_METHOD_OPTIONS = [
  { value: 'phone', label: 'Phone', icon: Phone, description: 'Phone calls' },
  { value: 'email', label: 'Email', icon: Mail, description: 'Email communication' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, description: 'WhatsApp messaging' },
  { value: 'other', label: 'Other', icon: Plus, description: 'Custom method' },
];

export function AdminOnboardingForm({ 
  userId, 
  existingData, 
  onSave 
}: AdminOnboardingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!existingData); // Start in edit mode if no data
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form data
  const [formData, setFormData] = useState({
    companyName: existingData?.companyName || '',
    address: {
      street: existingData?.address?.street || '',
      city: existingData?.address?.city || '',
      postalCode: existingData?.address?.postalCode || '',
      country: existingData?.address?.country || '',
      state: existingData?.address?.state || ''
    },
    phoneNumber: existingData?.phoneNumber || '',
    preferredContactMethods: existingData?.preferredContactMethods || [] as ContactMethod[],
    servicesInterested: existingData?.servicesInterested || [] as ServiceInterest[],
    trafficVolume: existingData?.trafficVolume || {
      type: 'volume' as 'volume' | 'agents',
      value: 0,
      unit: 'minutes' as 'minutes' | 'calls' | 'sms' | 'agents',
      period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly'
    },
    additionalNotes: existingData?.additionalNotes || ''
  });

  // Contact method form
  const [newContactMethod, setNewContactMethod] = useState<ContactMethod>({
    type: 'phone',
    value: '',
    description: ''
  });

  // Service selection
  const [selectedServices, setSelectedServices] = useState<string[]>(
    existingData?.servicesInterested?.map(s => s.service) || []
  );
  const [serviceDescriptions, setServiceDescriptions] = useState<Record<string, string>>(
    existingData?.servicesInterested?.reduce((acc, service) => ({
      ...acc,
      [service.service]: service.description || ''
    }), {}) || {}
  );
  const [serviceCountries, setServiceCountries] = useState<Record<string, string[]>>(
    existingData?.servicesInterested?.reduce((acc, service) => ({
      ...acc,
      [service.service]: service.countries || []
    }), {}) || {}
  );

  // Selected country for address
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(() => {
    if (existingData?.address?.country) {
      return COUNTRIES.find(c => c.name === existingData.address.country) || null;
    }
    return null;
  });

  const handleNext = () => {
    if (isEditing ? validateCurrentStep() : true) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    if (!isEditing) return true; // Skip validation in view mode

    switch (currentStep) {
      case 1: // Company details
        if (!formData.companyName.trim()) {
          toast.error('Company name is required');
          return false;
        }
        if (!formData.address.street.trim() || !formData.address.city.trim() || 
            !formData.address.postalCode.trim() || !formData.address.country) {
          toast.error('Complete address is required');
          return false;
        }
        if (!formData.phoneNumber.trim()) {
          toast.error('Phone number is required');
          return false;
        }
        return true;

      case 2: // Contact methods
        if (formData.preferredContactMethods.length === 0) {
          toast.error('At least one contact method is required');
          return false;
        }
        return true;

      case 3: // Services
        if (selectedServices.length === 0) {
          toast.error('Please select at least one service');
          return false;
        }
        return true;

      case 4: // Traffic volume
        if (formData.trafficVolume.value <= 0) {
          toast.error('Please specify traffic volume');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleCountrySelect = (country: CountryData) => {
    setSelectedCountry(country);
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        country: country.name
      }
    }));
  };

  const addContactMethod = () => {
    if (!newContactMethod.value.trim()) {
      toast.error('Contact value is required');
      return;
    }

    if (newContactMethod.type === 'other' && !newContactMethod.description?.trim()) {
      toast.error('Description is required for other contact methods');
      return;
    }

    setFormData(prev => ({
      ...prev,
      preferredContactMethods: [...prev.preferredContactMethods, { ...newContactMethod }]
    }));

    setNewContactMethod({
      type: 'phone',
      value: '',
      description: ''
    });
  };

  const removeContactMethod = (index: number) => {
    setFormData(prev => ({
      ...prev,
      preferredContactMethods: prev.preferredContactMethods.filter((_, i) => i !== index)
    }));
  };

  const handleServiceToggle = (serviceValue: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceValue)) {
        return prev.filter(s => s !== serviceValue);
      } else {
        return [...prev, serviceValue];
      }
    });
  };

  const handleServiceDescriptionChange = (service: string, description: string) => {
    setServiceDescriptions(prev => ({ ...prev, [service]: description }));
  };

  const handleServiceCountriesChange = (service: string, countries: string[]) => {
    setServiceCountries(prev => ({ ...prev, [service]: countries }));
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      // Basic validation
      if (!formData.companyName.trim()) {
        toast.error('Company name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.address.street.trim() || !formData.address.city.trim() || 
          !formData.address.postalCode.trim() || !formData.address.country.trim()) {
        toast.error('Complete address is required');
        setIsLoading(false);
        return;
      }

      if (!formData.phoneNumber.trim()) {
        toast.error('Phone number is required');
        setIsLoading(false);
        return;
      }

      if (formData.preferredContactMethods.length === 0) {
        toast.error('At least one contact method is required');
        setIsLoading(false);
        return;
      }

      if (selectedServices.length === 0) {
        toast.error('At least one service must be selected');
        setIsLoading(false);
        return;
      }

      if (formData.trafficVolume.value <= 0) {
        toast.error('Traffic volume must be greater than 0');
        setIsLoading(false);
        return;
      }

      // Prepare services data
      const servicesInterested: ServiceInterest[] = selectedServices.map(service => ({
        service: service as ServiceInterest['service'],
        description: serviceDescriptions[service] || undefined,
        countries: serviceCountries[service] || undefined
      }));

      const onboardingData = {
        ...formData,
        servicesInterested,
        completed: true,
        completedAt: new Date().toISOString(),
      };

      const response = await fetch(`/api/admin/onboarding/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save onboarding data');
      }

      toast.success('Onboarding data saved successfully!');
      setIsEditing(false);
      onSave();
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save onboarding data');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div 
                className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-black dark:bg-white"
              >
                <Building2 className="h-6 w-6 text-white dark:text-black" />
              </div>
              <div>
                <h3 
                  className="text-xl font-bold text-black dark:text-white"
                >
                  Company Information
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isEditing ? 'Edit company details' : 'Company information overview'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium text-black dark:text-white">Company Name *</Label>
                {isEditing ? (
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Enter company name"
                    className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                  />
                ) : (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                    <p className="font-medium text-black dark:text-white">{formData.companyName || 'Not provided'}</p>
                  </div>
                )}
              </div>

              {/* Address Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-black dark:text-white">Business Address *</Label>
                
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <Input
                        value={formData.address.street}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, street: e.target.value }
                        }))}
                        placeholder="Street address"
                        className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <Input
                        value={formData.address.city}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, city: e.target.value }
                        }))}
                        placeholder="City"
                        className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <Input
                        value={formData.address.postalCode}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, postalCode: e.target.value }
                        }))}
                        placeholder="Postal code"
                        className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <Input
                        value={formData.address.state}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          address: { ...prev.address, state: e.target.value }
                        }))}
                        placeholder="State/Province"
                        className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <CountrySelector
                        value={selectedCountry?.code}
                        onValueChange={handleCountrySelect}
                        placeholder="Select country"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 space-y-1">
                    <p className="font-medium text-black dark:text-white">{formData.address.street || 'Not provided'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formData.address.city && formData.address.postalCode && 
                        `${formData.address.city}, ${formData.address.postalCode}`}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formData.address.state && `${formData.address.state}, `}{formData.address.country}
                    </p>
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-black dark:text-white">Business Phone Number *</Label>
                {isEditing ? (
                  <div className="flex space-x-2">
                    {/* Country Code Display */}
                    {selectedCountry?.phoneCode && (
                      <div className="flex items-center bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-medium text-black dark:text-white min-w-0">
                        <span className="text-lg leading-none mr-2">{selectedCountry.flag}</span>
                        <span className="whitespace-nowrap">{selectedCountry.phoneCode}</span>
                      </div>
                    )}
                    
                    {/* Phone Number Field */}
                    <Input
                      type="tel"
                      value={formData.phoneNumber.startsWith(selectedCountry?.phoneCode || '') ? 
                        formData.phoneNumber.substring((selectedCountry?.phoneCode || '').length).trim() : 
                        formData.phoneNumber}
                      onChange={(e) => {
                        const phoneNumber = e.target.value.replace(/[^\d\s\-\(\)]/g, ''); // Clean input
                        const fullNumber = selectedCountry?.phoneCode ? 
                          `${selectedCountry.phoneCode} ${phoneNumber}`.trim() : phoneNumber;
                        setFormData(prev => ({ ...prev, phoneNumber: fullNumber }));
                      }}
                      placeholder="Enter phone number"
                      className="flex-1 h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                    <p className="font-medium text-black dark:text-white">{formData.phoneNumber || 'Not provided'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div 
                className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-black dark:bg-white"
              >
                <MessageCircle className="h-6 w-6 text-white dark:text-black" />
              </div>
              <div>
                <h3 
                  className="text-xl font-bold text-black dark:text-white"
                >
                  Contact Preferences
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isEditing ? 'Manage contact methods' : 'Preferred contact methods'}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Add Contact Method */}
              {isEditing && (
                <Card className="border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-black dark:text-white">
                      <Plus className="h-4 w-4 text-black dark:text-white" />
                      Add Contact Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Select
                          value={newContactMethod.type}
                          onValueChange={(value: string) => setNewContactMethod(prev => ({ ...prev, type: value as ContactMethod['type'] }))}
                        >
                          <SelectTrigger className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_METHOD_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center space-x-2">
                                  <option.icon className="h-4 w-4" />
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <Input
                          value={newContactMethod.value}
                          onChange={(e) => setNewContactMethod(prev => ({ ...prev, value: e.target.value }))}
                          placeholder={
                            newContactMethod.type === 'phone' ? '+1 555 123 4567' : 
                            newContactMethod.type === 'email' ? 'contact@company.com' : 
                            newContactMethod.type === 'whatsapp' ? '+1 555 123 4567' : 
                            'Enter contact details'
                          }
                          className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                        />
                      </div>
                      
                      <div>
                        <Button 
                          onClick={addContactMethod} 
                          className="h-10 w-full text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {newContactMethod.type === 'other' && (
                      <div className="mt-3">
                        <Input
                          value={newContactMethod.description || ''}
                          onChange={(e) => setNewContactMethod(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Description for other method"
                          className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Existing Contact Methods */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-black dark:text-white">Contact Methods</Label>
                
                {formData.preferredContactMethods.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No contact methods added yet</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {formData.preferredContactMethods.map((method, index) => {
                      const MethodIcon = CONTACT_METHOD_OPTIONS.find(opt => opt.value === method.type)?.icon || MessageCircle;
                      return (
                        <Card key={index} className="p-3 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
                              >
                                <MethodIcon className="h-4 w-4 text-black dark:text-white" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary">
                                    {CONTACT_METHOD_OPTIONS.find(opt => opt.value === method.type)?.label || method.type}
                                  </Badge>
                                  <span className="font-medium text-black dark:text-white">{method.value}</span>
                                </div>
                                {method.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{method.description}</p>
                                )}
                              </div>
                            </div>
                            {isEditing && (
                              <Button
                                onClick={() => removeContactMethod(index)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div 
                className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-black dark:bg-white"
              >
                <Target className="h-6 w-6 text-white dark:text-black" />
              </div>
              <div>
                <h3 
                  className="text-xl font-bold text-black dark:text-white"
                >
                  Services & Solutions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isEditing ? 'Select and configure services' : 'Interested services overview'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {SERVICE_OPTIONS.map((service) => {
                const isSelected = selectedServices.includes(service.value);
                const ServiceIcon = service.icon;
                
                return (
                  <Card 
                    key={service.value} 
                    className={`transition-all duration-200 cursor-pointer border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 ${
                      isSelected 
                        ? 'shadow-md border-black dark:border-white' 
                        : 'hover:shadow-sm'
                    }`}
                    onClick={() => isEditing && handleServiceToggle(service.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center space-x-3 flex-1">
                          {isEditing && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleServiceToggle(service.value)}
                            />
                          )}
                          <div 
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSelected 
                                ? 'bg-black dark:bg-white text-white dark:text-black' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <ServiceIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-black dark:text-white">{service.label}</h4>
                              {isSelected && (
                                <Badge 
                                  variant="secondary"
                                  className="bg-black dark:bg-white text-white dark:text-black"
                                >
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{service.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded options for selected services */}
                      {isSelected && (
                        <div className="mt-4 space-y-3 border-t pt-4" onClick={(e) => e.stopPropagation()}>
                          {/* Service Description */}
                          <div>
                            <Label className="text-sm font-medium text-black dark:text-white">Additional Details (Optional)</Label>
                            {isEditing ? (
                              <Textarea
                                value={serviceDescriptions[service.value] || ''}
                                onChange={(e) => handleServiceDescriptionChange(service.value, e.target.value)}
                                placeholder={`Describe your ${service.label.toLowerCase()} requirements...`}
                                rows={2}
                                className="mt-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                              />
                            ) : (
                              <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm text-black dark:text-white">
                                {serviceDescriptions[service.value] || 'No additional details provided'}
                              </div>
                            )}
                          </div>
                          
                          {/* Country Selection for services that need it */}
                          {service.needsCountries && (
                            <div>
                              <Label className="text-sm font-medium text-black dark:text-white">Target Countries</Label>
                              {isEditing ? (
                                <div className="mt-1">
                                  <MultiCountrySelector
                                    values={serviceCountries[service.value] || []}
                                    onValuesChange={(countries: string[]) => handleServiceCountriesChange(service.value, countries)}
                                    placeholder="Select target countries"
                                  />
                                </div>
                              ) : (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {(serviceCountries[service.value] || []).length > 0 ? (
                                    serviceCountries[service.value]?.map((country) => (
                                      <Badge key={country} variant="outline" className="text-xs">
                                        {country}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">No countries specified</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div 
                className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-black dark:bg-white"
              >
                <BarChart3 className="h-6 w-6 text-white dark:text-black" />
              </div>
              <div>
                <h3 
                  className="text-xl font-bold text-black dark:text-white"
                >
                  Traffic & Scale
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isEditing ? 'Configure expected volume' : 'Expected traffic overview'}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Traffic Volume Type */}
              <Card className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-black dark:text-white">Volume Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <RadioGroup
                      value={formData.trafficVolume.type}
                      onValueChange={(value: 'volume' | 'agents') => 
                        setFormData(prev => ({ 
                          ...prev, 
                          trafficVolume: { ...prev.trafficVolume, type: value }
                        }))
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="volume" id="volume" />
                        <Label htmlFor="volume" className="text-black dark:text-white">Communication Volume</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="agents" id="agents" />
                        <Label htmlFor="agents" className="text-black dark:text-white">Number of Agents</Label>
                      </div>
                    </RadioGroup>
                  ) : (
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium text-black dark:text-white">
                        {formData.trafficVolume.type === 'volume' ? 'Communication Volume' : 'Number of Agents'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Volume/Agent Count */}
              <Card className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-black dark:text-white">
                    {formData.trafficVolume.type === 'volume' ? 'Expected Volume' : 'Agent Count'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-black dark:text-white">
                          {formData.trafficVolume.type === 'volume' ? 'Volume Amount' : 'Number of Agents'}
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.trafficVolume.value || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            trafficVolume: { ...prev.trafficVolume, value: parseInt(e.target.value) || 0 }
                          }))}
                          placeholder="Enter amount"
                          className="mt-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                        />
                      </div>

                      {formData.trafficVolume.type === 'volume' && (
                        <>
                          <div>
                            <Label className="text-sm font-medium text-black dark:text-white">Unit</Label>
                            <Select
                              value={formData.trafficVolume.unit}
                              onValueChange={(value: string) => setFormData(prev => ({ 
                                ...prev, 
                                trafficVolume: { ...prev.trafficVolume, unit: value as 'minutes' | 'calls' | 'sms' | 'agents' }
                              }))}
                            >
                              <SelectTrigger className="mt-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="calls">Calls</SelectItem>
                                <SelectItem value="sms">SMS Messages</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-black dark:text-white">Period</Label>
                            <Select
                              value={formData.trafficVolume.period}
                              onValueChange={(value: string) => setFormData(prev => ({ 
                                ...prev, 
                                trafficVolume: { ...prev.trafficVolume, period: value as 'daily' | 'weekly' | 'monthly' | 'yearly' }
                              }))}
                            >
                              <SelectTrigger className="mt-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium text-black dark:text-white">
                        {formData.trafficVolume.value.toLocaleString()}{' '}
                        {formData.trafficVolume.type === 'agents' 
                          ? 'agents' 
                          : `${formData.trafficVolume.unit} ${formData.trafficVolume.period}`
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="additionalNotes" className="text-sm font-medium text-black dark:text-white">Additional Requirements (Optional)</Label>
                {isEditing ? (
                  <>
                    <Textarea
                      id="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      placeholder="Any specific requirements, integrations, or special needs..."
                      rows={3}
                      maxLength={1000}
                      className="text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                    />
                    <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                      {formData.additionalNotes.length}/1000 characters
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-black dark:text-white">{formData.additionalNotes || 'No additional requirements specified'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderViewModeContent = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Company Information Card */}
        <Card className="h-fit border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-black dark:text-white">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
              >
                <Building2 className="h-4 w-4 text-black dark:text-white" />
              </div>
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Company Name</span>
              <p className="font-medium text-black dark:text-white">{formData.companyName || 'Not provided'}</p>
            </div>
            
            <div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Address</span>
              <div className="text-sm text-black dark:text-white">
                <p>{formData.address.street || 'Not provided'}</p>
                <p>
                  {formData.address.city && formData.address.postalCode && 
                    `${formData.address.city}, ${formData.address.postalCode}`}
                </p>
                <p>
                  {formData.address.state && `${formData.address.state}, `}{formData.address.country}
                </p>
              </div>
            </div>
            
            <div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Phone Number</span>
              <p className="font-medium text-black dark:text-white">{formData.phoneNumber || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Methods Card */}
        <Card className="h-fit border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-black dark:text-white">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
              >
                <MessageCircle className="h-4 w-4 text-black dark:text-white" />
              </div>
              Contact Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.preferredContactMethods.length > 0 ? (
              <div className="space-y-2">
                {formData.preferredContactMethods.map((method, index) => {
                  const MethodIcon = CONTACT_METHOD_OPTIONS.find(opt => opt.value === method.type)?.icon || MessageCircle;
                  return (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <MethodIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {CONTACT_METHOD_OPTIONS.find(opt => opt.value === method.type)?.label || method.type}
                          </Badge>
                          <span className="text-sm font-medium truncate text-black dark:text-white">{method.value}</span>
                        </div>
                        {method.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{method.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">No contact methods provided</p>
            )}
          </CardContent>
        </Card>

        {/* Services Card */}
        <Card className="h-fit border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-black dark:text-white">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
              >
                <Target className="h-4 w-4 text-black dark:text-white" />
              </div>
              Services & Solutions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.servicesInterested.length > 0 ? (
              <div className="space-y-3">
                {formData.servicesInterested.map((service, index) => {
                  const serviceOption = SERVICE_OPTIONS.find(opt => opt.value === service.service);
                  const ServiceIcon = serviceOption?.icon || Target;
                  return (
                    <div key={index} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <ServiceIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span className="font-medium text-sm text-black dark:text-white">{serviceOption?.label || service.service}</span>
                      </div>
                      
                      {service.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{service.description}</p>
                      )}
                      
                      {service.countries && service.countries.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {service.countries.slice(0, 3).map(country => (
                            <Badge key={country} variant="outline" className="text-xs">
                              {country}
                            </Badge>
                          ))}
                          {service.countries.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{service.countries.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">No services specified</p>
            )}
          </CardContent>
        </Card>

        {/* Traffic & Scale Card */}
        <Card className="h-fit border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-black dark:text-white">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
              >
                <BarChart3 className="h-4 w-4 text-black dark:text-white" />
              </div>
              Traffic & Scale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Volume Type</span>
              <p className="font-medium text-black dark:text-white">
                {formData.trafficVolume.type === 'volume' ? 'Communication Volume' : 'Number of Agents'}
              </p>
            </div>
            
            <div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Expected Volume</span>
              <p className="font-medium text-black dark:text-white">
                {formData.trafficVolume.value.toLocaleString()}{' '}
                {formData.trafficVolume.type === 'agents' 
                  ? 'agents' 
                  : `${formData.trafficVolume.unit} ${formData.trafficVolume.period}`
                }
              </p>
            </div>

            {formData.additionalNotes && (
              <div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Additional Notes</span>
                <p className="text-sm mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-black dark:text-white">{formData.additionalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Step indicators
  const stepIndicators = [
    { step: 1, label: 'Company', icon: Building2 },
    { step: 2, label: 'Contact', icon: MessageCircle },
    { step: 3, label: 'Services', icon: Target },
    { step: 4, label: 'Scale', icon: BarChart3 },
  ];

  if (!existingData && !isEditing) {
    return (
      <div 
        className="text-center py-12"
      >
        <div className="space-y-4">
          <div 
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-black dark:bg-white"
          >
            <Users className="h-8 w-8 text-white dark:text-black" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              No Onboarding Data
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              This user hasn't completed onboarding yet.
            </p>
          </div>
          <Button 
            onClick={() => setIsEditing(true)}
            className="gap-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            <Plus className="h-4 w-4" />
            Create Onboarding Data
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-black dark:bg-white text-white dark:text-black"
            >
              <Sparkles className="h-4 w-4" />
              {isEditing ? 'Edit Mode' : 'View Mode'}
            </div>
          </div>
          <h3 className="text-lg font-semibold text-black dark:text-white">
            Onboarding Information
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isEditing ? 'Edit onboarding details with step-by-step interface' : 'Complete onboarding overview'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="outline"
              className="gap-2 border-black dark:border-white text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="gap-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
              <Button 
                onClick={() => setIsEditing(false)} 
                variant="outline"
                disabled={isLoading}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Steps (only in edit mode) */}
      {isEditing && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {stepIndicators.map((indicator, index) => {
              const isActive = currentStep === indicator.step;
              const isCompleted = currentStep > indicator.step;
              const IconComponent = indicator.icon;

              return (
                <div key={indicator.step} className="flex items-center">
                  <div 
                    className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 cursor-pointer ${
                      isActive 
                        ? 'shadow-md scale-105 bg-black dark:bg-white' 
                        : isCompleted
                        ? 'shadow-sm bg-black dark:bg-white'
                        : 'bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
                    }`}
                    onClick={() => setCurrentStep(indicator.step)}
                  >
                    <IconComponent className={`h-4 w-4 ${
                      isActive || isCompleted ? 'text-white dark:text-black' : 'text-gray-500 dark:text-gray-400'
                    }`} />
                    {isCompleted && (
                      <div 
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-green-500"
                      >
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="ml-2 hidden md:block">
                    <div className={`text-xs font-medium ${
                      isActive ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {indicator.label}
                    </div>
                  </div>
                  
                  {index < stepIndicators.length - 1 && (
                    <div 
                      className={`flex-1 h-0.5 mx-3 rounded-full transition-colors duration-300 ${
                        currentStep > indicator.step ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full transition-all duration-500 ease-out rounded-full bg-black dark:bg-white"
              style={{ 
                width: `${(currentStep / totalSteps) * 100}%`
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% complete</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Card 
        className="border-gray-300 dark:border-gray-600 shadow-lg bg-white dark:bg-gray-900"
      >
        <CardContent className="p-6">
          {isEditing ? renderStepContent() : renderViewModeContent()}
        </CardContent>
      </Card>

      {/* Navigation (only in edit mode) */}
      {isEditing && (
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 1 ? (
              <Button onClick={handlePrevious} variant="outline" className="gap-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            ) : (
              <div></div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {currentStep < totalSteps ? (
              <Button 
                onClick={handleNext} 
                className="gap-2 text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200"
                disabled={isEditing && !validateCurrentStep()}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSave} 
                disabled={isLoading} 
                className="gap-2 text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 