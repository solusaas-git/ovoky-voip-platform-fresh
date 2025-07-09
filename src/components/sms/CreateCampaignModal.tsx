'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { CalendarDays, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ContactList {
  _id: string;
  name: string;
  contactCount: number;
}

interface SmsTemplate {
  _id: string;
  name: string;
  message: string;
}

interface SenderId {
  _id: string;
  senderId: string;
  status: 'approved';
  type: 'alphanumeric' | 'numeric';
}

interface SmsGateway {
  _id: string;
  name: string;
  displayName: string;
  isActive: boolean;
}

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: () => void;
  editingCampaign?: any;
}

export function CreateCampaignModal({ 
  isOpen, 
  onClose, 
  onCampaignCreated, 
  editingCampaign 
}: CreateCampaignModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [senderIds, setSenderIds] = useState<SenderId[]>([]);
  const [providers, setProviders] = useState<SmsGateway[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [formDataLoaded, setFormDataLoaded] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contactListId: '',
    templateId: '',
    senderId: '',
    providerId: '',
    country: '',
    isScheduled: false,
    scheduledAt: '',
    scheduledTime: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Only load form data if not already loaded
      if (!formDataLoaded) {
        loadFormData();
      }
      
      if (editingCampaign) {
        populateForm(editingCampaign);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingCampaign, formDataLoaded]);

  const loadFormData = async () => {
    if (formDataLoaded) return; // Skip if already loaded
    
    setIsLoadingFormData(true);
    try {
      console.log('🚀 Loading form data...');
      
      // Make all API calls in parallel for better performance
      const [
        contactListsResponse,
        templatesResponse,
        senderIdsResponse,
        providersResponse,
        countriesResponse
      ] = await Promise.all([
        fetch('/api/sms/contact-lists'),
        fetch('/api/sms/templates'),
        fetch('/api/sms/sender-ids'),
        fetch('/api/sms/providers'),
        fetch('/api/rates/sms/user-countries')
      ]);

      // Process responses in parallel
      const [
        contactListsData,
        templatesData,
        senderIdsData,
        providersData,
        countriesData
      ] = await Promise.all([
        contactListsResponse.ok ? contactListsResponse.json() : { contactLists: [] },
        templatesResponse.ok ? templatesResponse.json() : { templates: [] },
        senderIdsResponse.ok ? senderIdsResponse.json() : { senderIds: [] },
        providersResponse.ok ? providersResponse.json() : { providers: [] },
        countriesResponse.ok ? countriesResponse.json() : { countries: [] }
      ]);

      // Update state
      setContactLists(contactListsData.contactLists || []);
      setTemplates(templatesData.templates || []);
      
      const approvedSenderIds = senderIdsData.senderIds?.filter((s: any) => s.status === 'approved') || [];
      setSenderIds(approvedSenderIds);
      
      setProviders(providersData.providers || []);
      setCountries(countriesData.countries || []);
      
      setFormDataLoaded(true);
      console.log('✅ Form data loaded successfully');
      
    } catch (error) {
      console.error('Failed to load form data:', error);
      toast.error('Failed to load form data', {
        description: 'Some fields may not be available'
      });
    } finally {
      setIsLoadingFormData(false);
    }
  };

  const populateForm = (campaign: any) => {
    console.log('🐛 Populating form with campaign data:', campaign);
    
    setFormData({
      name: campaign.name || '',
      description: campaign.description || '',
      contactListId: campaign.contactListId || '',
      templateId: campaign.templateId || '',
      senderId: campaign.senderId || '',
      providerId: campaign.providerId || '',
      country: campaign.country || '',
      isScheduled: !!campaign.scheduledAt,
      scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().split('T')[0] : '',
      scheduledTime: campaign.scheduledAt ? new Date(campaign.scheduledAt).toTimeString().split(' ')[0].substring(0, 5) : ''
    });
    
    console.log('🐛 Form data after population:', {
      contactListId: campaign.contactListId || '',
      templateId: campaign.templateId || '',
      senderId: campaign.senderId || '',
      providerId: campaign.providerId || '',
      country: campaign.country || ''
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      contactListId: '',
      templateId: '',
      senderId: '',
      providerId: '',
      country: '',
      isScheduled: false,
      scheduledAt: '',
      scheduledTime: ''
    });
    setErrors({});
  };

  // Add a function to refresh cache if needed
  const refreshFormData = async () => {
    setFormDataLoaded(false);
    await loadFormData();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (!formData.contactListId) {
      newErrors.contactListId = 'Please select a contact list';
    }

    if (!formData.templateId) {
      newErrors.templateId = 'Please select a template';
    }

    if (!formData.senderId) {
      newErrors.senderId = 'Please select a sender ID';
    }

    if (!formData.providerId) {
      newErrors.providerId = 'Please select a gateway';
    }

    if (!formData.country) {
      newErrors.country = 'Please select a country';
    }

    if (formData.isScheduled) {
      if (!formData.scheduledAt) {
        newErrors.scheduledAt = 'Please select a date';
      }
      if (!formData.scheduledTime) {
        newErrors.scheduledTime = 'Please select a time';
      }
      
      if (formData.scheduledAt && formData.scheduledTime) {
        const scheduledDateTime = new Date(`${formData.scheduledAt}T${formData.scheduledTime}`);
        if (scheduledDateTime <= new Date()) {
          newErrors.scheduledAt = 'Scheduled time must be in the future';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const scheduledAt = formData.isScheduled 
        ? new Date(`${formData.scheduledAt}T${formData.scheduledTime}`)
        : null;

      // Get the selected template to extract the message
      const selectedTemplate = templates.find(t => t._id === formData.templateId);
      if (!selectedTemplate) {
        toast.error('Selected template not found');
        setIsLoading(false);
        return;
      }

      const campaignData = {
        name: formData.name,
        description: formData.description,
        contactListId: formData.contactListId,
        templateId: formData.templateId,
        message: selectedTemplate.message, // Use template message
        senderId: formData.senderId,
        providerId: formData.providerId,
        country: formData.country,
        scheduledAt: scheduledAt?.toISOString() || null,
        status: formData.isScheduled ? 'scheduled' : 'draft'
      };

      console.log('🚀 Submitting campaign data:', campaignData);
      console.log('📝 Is editing?', !!editingCampaign, editingCampaign?._id);

      const url = editingCampaign 
        ? `/api/sms/campaigns/${editingCampaign._id}`
        : '/api/sms/campaigns';
      
      const method = editingCampaign ? 'PUT' : 'POST';

      console.log('📡 Making request:', { method, url });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      });

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Success response:', responseData);
        toast.success(editingCampaign ? 'Campaign updated successfully!' : 'Campaign created successfully!');
        onCampaignCreated();
        onClose();
        resetForm();
      } else {
        const data = await response.json();
        console.error('❌ Error response:', data);
        toast.error('Failed to save campaign', {
          description: data.error || 'An error occurred'
        });
      }
    } catch (error) {
      toast.error('Network error', {
        description: 'Failed to save campaign'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedContactList = contactLists.find(list => list._id === formData.contactListId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ width: '50vw', maxWidth: '50vw' }}>
        <DialogHeader>
          <DialogTitle>
            {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
          </DialogTitle>
          <DialogDescription>
            {editingCampaign 
              ? 'Update your SMS campaign settings'
              : 'Create a new SMS campaign to send messages to your contacts'
            }
          </DialogDescription>
        </DialogHeader>

        {isLoadingFormData && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-muted-foreground">Loading form data...</span>
            </div>
          </div>
        )}

        {!isLoadingFormData && !formDataLoaded && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Failed to load form data.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshFormData}
                className="h-8"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {!isLoadingFormData && formDataLoaded && (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Basic Information</h4>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter campaign name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional campaign description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Delivery Settings</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senderId">Sender ID *</Label>
                  <Select value={formData.senderId} onValueChange={(value) => handleInputChange('senderId', value)}>
                    <SelectTrigger className={errors.senderId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select sender ID" />
                    </SelectTrigger>
                    <SelectContent>
                      {senderIds.map((sender) => (
                        <SelectItem key={sender._id} value={sender.senderId}>
                          {sender.senderId} ({sender.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.senderId && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.senderId}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="providerId">SMS Gateway *</Label>
                  <Select value={formData.providerId} onValueChange={(value) => handleInputChange('providerId', value)}>
                    <SelectTrigger className={errors.providerId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider._id} value={provider._id}>
                          {provider.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.providerId && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.providerId}
                    </p>
                  )}
                </div>

              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Audience & Content</h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Destination Country *</Label>
                  <Select 
                    value={formData.country} 
                    onValueChange={(value) => handleInputChange('country', value)}
                    disabled={countries.length === 0}
                  >
                    <SelectTrigger className={errors.country ? 'border-destructive' : ''}>
                      <SelectValue placeholder={countries.length === 0 ? "No countries available" : "Select destination country"} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country, index) => (
                        <SelectItem key={index} value={country.name}>
                          {country.name} (+{country.phoneCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.country && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.country}
                    </p>
                  )}
                  {countries.length === 0 ? (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      No countries available in your assigned SMS rate deck. Please contact your administrator.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select from countries available in your assigned SMS rate deck
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactListId">Contact List *</Label>
                  <Select value={formData.contactListId} onValueChange={(value) => handleInputChange('contactListId', value)}>
                    <SelectTrigger className={errors.contactListId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select contact list" />
                    </SelectTrigger>
                    <SelectContent>
                      {contactLists.map((list) => (
                        <SelectItem key={list._id} value={list._id}>
                          {list.name} ({list.contactCount} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.contactListId && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.contactListId}
                    </p>
                  )}
                  {selectedContactList && (
                    <p className="text-sm text-muted-foreground">
                      Will send to {selectedContactList.contactCount} contacts
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateId">SMS Template *</Label>
                  <Select value={formData.templateId} onValueChange={(value) => handleInputChange('templateId', value)}>
                    <SelectTrigger className={errors.templateId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template._id} value={template._id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.templateId && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.templateId}
                    </p>
                  )}
                  {formData.templateId && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Template Preview:</p>
                      <p className="text-sm">
                        {templates.find(t => t._id === formData.templateId)?.message || ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Scheduling</h4>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isScheduled"
                  checked={formData.isScheduled}
                  onCheckedChange={(checked) => handleInputChange('isScheduled', checked)}
                />
                <Label htmlFor="isScheduled">Schedule for later</Label>
              </div>

              {formData.isScheduled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledAt">Date *</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="scheduledAt"
                        type="date"
                        value={formData.scheduledAt}
                        onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                        className={`pl-10 ${errors.scheduledAt ? 'border-destructive' : ''}`}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    {errors.scheduledAt && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.scheduledAt}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime">Time *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="scheduledTime"
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                        className={`pl-10 ${errors.scheduledTime ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.scheduledTime && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.scheduledTime}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading 
              ? (editingCampaign ? 'Updating...' : 'Creating...') 
              : (editingCampaign ? 'Update Campaign' : 'Create Campaign')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}