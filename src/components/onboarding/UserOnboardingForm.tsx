'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountrySelector } from '@/components/ui/country-selector';
import { MultiCountrySelector } from '@/components/ui/multi-country-selector';
import { 
  Building2, 
  Phone, 
  Mail, 
  MessageCircle, 
  Plus, 
  X, 
  Check,
  BarChart3,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { UserOnboarding, ContactMethod, ServiceInterest } from '@/models/UserOnboarding';
import { CountryData } from '@/data/countries';

interface UserOnboardingFormProps {
  onComplete: () => void;
  onSkip?: () => void;
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

export function UserOnboardingForm({ onComplete, onSkip }: UserOnboardingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form data
  const [formData, setFormData] = useState({
    companyName: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: '',
      state: ''
    },
    phoneNumber: '',
    preferredContactMethods: [] as ContactMethod[],
    servicesInterested: [] as ServiceInterest[],
    trafficVolume: {
      type: 'volume' as 'volume' | 'agents',
      value: 0,
      unit: 'minutes' as 'minutes' | 'calls' | 'sms' | 'agents',
      period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly'
    },
    additionalNotes: ''
  });

  // Contact method form
  const [newContactMethod, setNewContactMethod] = useState<ContactMethod>({
    type: 'phone',
    value: '',
    description: ''
  });

  // Service selection
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceDescriptions, setServiceDescriptions] = useState<Record<string, string>>({});
  const [serviceCountries, setServiceCountries] = useState<Record<string, string[]>>({});

  // Selected country for address
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
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

  const handleCountrySelect = (country: CountryData) => {
    const previousCountry = selectedCountry;
    setSelectedCountry(country);
    setFormData(prev => {
      // Update address country
      const updatedForm = {
        ...prev,
        address: { ...prev.address, country: country.name }
      };

      // Update phone number if there's an existing phone number and country code changed
      if (prev.phoneNumber && country.phoneCode) {
        let phoneWithoutCode = prev.phoneNumber;
        
        // Remove previous country code if it exists
        if (previousCountry?.phoneCode && prev.phoneNumber.startsWith(previousCountry.phoneCode)) {
          phoneWithoutCode = prev.phoneNumber.substring(previousCountry.phoneCode.length).trim();
        }
        
        // Add new country code
        updatedForm.phoneNumber = phoneWithoutCode ? 
          `${country.phoneCode} ${phoneWithoutCode}`.trim() : 
          country.phoneCode;
      }

      return updatedForm;
    });
  };



  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsLoading(true);

    try {
      // Prepare services data
      const servicesInterested: ServiceInterest[] = selectedServices.map(service => ({
        service: service as any,
        description: serviceDescriptions[service] || undefined,
        countries: serviceCountries[service] || undefined
      }));

      const onboardingData: Omit<UserOnboarding, 'userId' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        servicesInterested,
      };

      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save onboarding data');
      }

      toast.success('Onboarding completed successfully!');
      onComplete();
    } catch (error) {
      console.error('Error submitting onboarding:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete onboarding');
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Tell us about your business</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium text-black dark:text-white">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Enter your company name"
                  className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                />
              </div>

              {/* Address Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-black dark:text-white">Business Address *</Label>
                
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
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-black dark:text-white">Business Phone Number *</Label>
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
                  How would you like us to reach out?
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Add Contact Method */}
              <Card className="border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-black dark:text-white">
                    <Plus className="h-4 w-4 text-black dark:text-white" />
                    Add Contact Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Select
                        value={newContactMethod.type}
                        onValueChange={(value: string) => setNewContactMethod(prev => ({ ...prev, type: value as ContactMethod['type'] }))}
                      >
                        <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
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
                    
                    <div>
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
                        className="h-10 w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  {newContactMethod.type === 'other' && (
                    <div className="mt-3">
                      <Input
                        value={newContactMethod.description || ''}
                        onChange={(e) => setNewContactMethod(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe method"
                        className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Existing Contact Methods */}
              {formData.preferredContactMethods.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-base font-semibold flex items-center gap-2 text-black dark:text-white">
                    <Check className="h-4 w-4 text-green-600" />
                    Your Contact Methods ({formData.preferredContactMethods.length})
                  </h4>
                  
                  <div className="grid gap-3">
                    {formData.preferredContactMethods.map((method, index) => {
                      const option = CONTACT_METHOD_OPTIONS.find(opt => opt.value === method.type);
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
                          <div className="flex items-center space-x-3">
                            {option?.icon && (
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
                              >
                                <option.icon className="h-4 w-4 text-black dark:text-white" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium capitalize text-sm text-black dark:text-white">{method.type}</div>
                              <div className="text-gray-600 dark:text-gray-400 text-xs">
                                {method.value}
                                {method.description && ` - ${method.description}`}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => removeContactMethod(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                  What services are you interested in?
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Services Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SERVICE_OPTIONS.map((service) => {
                  const isSelected = selectedServices.includes(service.value);
                  
                  return (
                    <Card 
                      key={service.value} 
                      className={`transition-all duration-200 hover:shadow-md border cursor-pointer ${
                        isSelected 
                          ? 'ring-2 border-black dark:border-white shadow-md' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-900'
                      }`}
                      style={isSelected ? { '--tw-ring-color': '#000000' } as React.CSSProperties : {}}
                      onClick={() => handleServiceToggle(service.value)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              <service.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-sm font-semibold text-black dark:text-white">{service.label}</CardTitle>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{service.description}</p>
                            </div>
                          </div>
                          <div 
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'bg-black dark:bg-white border-black dark:border-white' : 'border-gray-400 dark:border-gray-500'
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-white dark:text-black" />}
                          </div>
                        </div>
                      </CardHeader>
                      
                      {/* Expanded options for selected services */}
                      {isSelected && (
                        <CardContent className="pt-0 space-y-3" onClick={(e) => e.stopPropagation()}>
                          {/* Service Description */}
                          <div>
                            <Label className="text-xs font-medium text-black dark:text-white">Additional Details (Optional)</Label>
                            <Textarea
                              value={serviceDescriptions[service.value] || ''}
                              onChange={(e) => handleServiceDescriptionChange(service.value, e.target.value)}
                              placeholder={`Describe your needs for ${service.label.toLowerCase()}...`}
                              rows={2}
                              className="text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          
                          {/* Country Selection for services that need it */}
                          {service.needsCountries && (
                            <div>
                              <Label className="text-xs font-medium text-black dark:text-white">Target Countries</Label>
                              <div className="mt-1">
                                <MultiCountrySelector
                                  values={serviceCountries[service.value] || []}
                                  onValuesChange={(countries: string[]) => handleServiceCountriesChange(service.value, countries)}
                                  placeholder="Select target countries"
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Empty State */}
              {selectedServices.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <Sparkles className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Select the services you're interested in above</p>
                </div>
              )}
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
                  Volume & Scale
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Help us understand your usage requirements
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Volume Type Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-black dark:text-white">What are you measuring? *</Label>
                <RadioGroup 
                  value={formData.trafficVolume.type} 
                  onValueChange={(value: 'volume' | 'agents') => 
                    setFormData(prev => ({ 
                      ...prev, 
                      trafficVolume: { ...prev.trafficVolume, type: value }
                    }))
                  }
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div 
                    className="flex items-center space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      trafficVolume: { ...prev.trafficVolume, type: 'volume' }
                    }))}
                  >
                    <RadioGroupItem value="volume" id="volume" />
                    <div className="flex-1">
                      <Label htmlFor="volume" className="text-black dark:text-white font-medium cursor-pointer">Communication Volume</Label>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Measure calls, SMS, or email volume</p>
                    </div>
                  </div>
                  <div 
                    className="flex items-center space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      trafficVolume: { ...prev.trafficVolume, type: 'agents' }
                    }))}
                  >
                    <RadioGroupItem value="agents" id="agents" />
                    <div className="flex-1">
                      <Label htmlFor="agents" className="text-black dark:text-white font-medium cursor-pointer">Number of Agents</Label>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Measure by team size</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Volume Input Section */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-black dark:text-white">
                  {formData.trafficVolume.type === 'volume' ? 'Expected Volume *' : 'Number of Agents *'}
                </Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {formData.trafficVolume.type === 'volume' ? 'Volume Amount' : 'Agent Count'}
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
                      className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                    />
                  </div>

                  {/* Unit Selection (only for volume) */}
                  {formData.trafficVolume.type === 'volume' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Unit</Label>
                      <Select
                        value={formData.trafficVolume.unit}
                        onValueChange={(value: string) => setFormData(prev => ({ 
                          ...prev, 
                          trafficVolume: { ...prev.trafficVolume, unit: value as 'minutes' | 'calls' | 'sms' | 'agents' }
                        }))}
                      >
                        <SelectTrigger className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="calls">Calls</SelectItem>
                          <SelectItem value="sms">SMS Messages</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Period Selection (only for volume) */}
                  {formData.trafficVolume.type === 'volume' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Period</Label>
                      <Select
                        value={formData.trafficVolume.period}
                        onValueChange={(value: string) => setFormData(prev => ({ 
                          ...prev, 
                          trafficVolume: { ...prev.trafficVolume, period: value as 'daily' | 'weekly' | 'monthly' | 'yearly' }
                        }))}
                      >
                        <SelectTrigger className="h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
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
                  )}
                </div>
              </div>

              {/* Volume Summary Display */}
              {formData.trafficVolume.value > 0 && (
                <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black dark:bg-white">
                      <BarChart3 className="h-4 w-4 text-white dark:text-black" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-black dark:text-white">Volume Summary</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-semibold">{formData.trafficVolume.value.toLocaleString()}</span>
                        <span className="mx-1">
                          {formData.trafficVolume.type === 'agents' 
                            ? 'agents' 
                            : `${formData.trafficVolume.unit} ${formData.trafficVolume.period}`
                          }
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Requirements */}
              <div className="space-y-2">
                <Label htmlFor="additionalNotes" className="text-sm font-medium text-black dark:text-white">
                  Additional Requirements
                  <span className="text-gray-600 dark:text-gray-400 ml-1">(Optional)</span>
                </Label>
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
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Step indicators
  const stepIndicators = [
    { step: 1, label: 'Company', icon: Building2 },
    { step: 2, label: 'Contact', icon: MessageCircle },
    { step: 3, label: 'Services', icon: Target },
    { step: 4, label: 'Scale', icon: BarChart3 },
  ];

  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      <div className="max-w-4xl mx-auto p-6 py-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div 
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-3 bg-black dark:bg-white text-white dark:text-black"
          >
            <Sparkles className="h-4 w-4" />
            Complete Your Profile
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-black dark:text-white">
            Welcome to Your Onboarding
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Help us understand your business needs so we can provide the best service for you.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {stepIndicators.map((indicator, index) => {
              const isActive = currentStep === indicator.step;
              const isCompleted = currentStep > indicator.step;
              const IconComponent = indicator.icon;

              return (
                <div key={indicator.step} className="flex items-center">
                  <div 
                    className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 ${
                      isActive 
                        ? 'shadow-md scale-105 bg-black dark:bg-white' 
                        : isCompleted
                        ? 'shadow-sm bg-black dark:bg-white'
                        : 'bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
                    }`}
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

        {/* Main Content */}
        <Card 
          className="max-w-4xl mx-auto border-gray-300 dark:border-gray-600 shadow-lg bg-white dark:bg-gray-900"
        >
          <CardHeader className="space-y-3 pb-6">
            <div 
              className="p-3 rounded-xl inline-flex shadow-lg bg-black dark:bg-white"
            >
              <UserCheck className="h-6 w-6 text-white dark:text-black" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 1 ? (
              <Button onClick={handlePrevious} variant="outline" className="gap-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            ) : (
              <Button onClick={onSkip} variant="ghost" className="text-gray-600 dark:text-gray-400 gap-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                Skip for now
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {currentStep < totalSteps ? (
              <Button 
                onClick={handleNext} 
                className="gap-2 text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
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
                    <Check className="h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 