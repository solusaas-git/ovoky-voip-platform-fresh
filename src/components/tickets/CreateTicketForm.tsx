'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTickets } from '@/hooks/useTickets';
import { 
  TicketService, 
  TicketPriority, 
  SERVICE_LABELS, 
  PRIORITY_LABELS,
  TicketAttachment,
  OutboundCallData,
  AssignedNumber,
  CreateTicketRequest
} from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  X, 
  FileText, 
  Image,
  AlertCircle,
  CheckCircle2,
  Loader2,
  PaperclipIcon,
  Sparkles,
  Zap,
  Phone,
  PhoneCall,
  Plus,
  Trash2,
  Globe,
  Hash
} from 'lucide-react';

interface CreateTicketFormProps {
  onSuccess?: (ticketId: string) => void;
  onCancel?: () => void;
}

// Country interface
interface Country {
  name: string;
  code: string;
  phoneCode: string;
}

// Services that require country selection
const SERVICES_REQUIRING_COUNTRY = ['outbound_calls', 'inbound_calls', 'did_numbers', 'sms'];

export default function CreateTicketForm({ onSuccess, onCancel }: CreateTicketFormProps) {
  const router = useRouter();
  const { createTicket, uploadFiles, loading, error, clearError } = useTickets();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    service: '' as TicketService,
    priority: 'medium' as TicketPriority,
    country: '',
  });

  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Service-specific data
  const [outboundCallData, setOutboundCallData] = useState<OutboundCallData>({
    examples: [{ number: '', callDate: '', description: '' }]
  });
  const [assignedNumbers, setAssignedNumbers] = useState<AssignedNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [selectedPhoneNumbers, setSelectedPhoneNumbers] = useState<string[]>([]);
  
  // Countries data
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  // Fetch countries on component mount
  useEffect(() => {
    fetchCountries();
  }, []);

  // Fetch assigned numbers when service is numbers/inbound or country changes
  useEffect(() => {
    if (formData.service === 'did_numbers' || formData.service === 'inbound_calls') {
      fetchAssignedNumbers();
      // Clear selected phone numbers when filter changes
      setSelectedPhoneNumbers([]);
    }
  }, [formData.service, formData.country]);

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch('/api/countries');
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const fetchAssignedNumbers = async () => {
    setLoadingNumbers(true);
    try {
      // Build URL with country filter if selected
      const url = formData.country 
        ? `/api/users/assigned-numbers?country=${encodeURIComponent(formData.country)}`
        : '/api/users/assigned-numbers';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAssignedNumbers(data.assignedNumbers || []);
      }
    } catch (error) {
      console.error('Error fetching assigned numbers:', error);
    } finally {
      setLoadingNumbers(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      errors.title = 'Title must be 200 characters or less';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length > 2000) {
      errors.description = 'Description must be 2000 characters or less';
    }

    if (!formData.service) {
      errors.service = 'Service is required';
    }

    if (!formData.priority) {
      errors.priority = 'Priority is required';
    }

    // Country validation for specific services
    if (SERVICES_REQUIRING_COUNTRY.includes(formData.service) && !formData.country) {
      errors.country = 'Country is required for this service';
    }

    // Outbound call data validation
    if (formData.service === 'outbound_calls') {
      const hasValidExample = outboundCallData.examples.some(
        example => example.number.trim() && (typeof example.callDate === 'string' ? example.callDate.trim() : example.callDate)
      );
      if (!hasValidExample) {
        errors.outboundCallData = 'At least one call example with number and date is required';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear country when service changes to one that doesn't require it
    if (field === 'service' && !SERVICES_REQUIRING_COUNTRY.includes(value as TicketService)) {
      setFormData(prev => ({ ...prev, country: '' }));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    clearError();

    try {
      const uploadedFiles = await uploadFiles(files);
      setAttachments(prev => [...prev, ...uploadedFiles]);
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploadingFiles(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Outbound call data handlers
  const addCallExample = () => {
    setOutboundCallData(prev => ({
      examples: [...prev.examples, { number: '', callDate: '', description: '' }]
    }));
  };

  const removeCallExample = (index: number) => {
    setOutboundCallData(prev => ({
      examples: prev.examples.filter((_, i) => i !== index)
    }));
  };

  const updateCallExample = (index: number, field: string, value: string) => {
    setOutboundCallData(prev => ({
      examples: prev.examples.map((example, i) => 
        i === index ? { ...example, [field]: value } : example
      )
    }));
  };

  // Phone number selection handlers
  const togglePhoneNumberSelection = (phoneNumber: string) => {
    setSelectedPhoneNumbers(prev => {
      if (prev.includes(phoneNumber)) {
        return prev.filter(num => num !== phoneNumber);
      } else {
        return [...prev, phoneNumber];
      }
    });
  };

  const selectAllPhoneNumbers = () => {
    setSelectedPhoneNumbers(assignedNumbers.map(num => num.number));
  };

  const clearPhoneNumberSelection = () => {
    setSelectedPhoneNumbers([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    clearError();

    const ticketData: CreateTicketRequest = {
      ...formData,
      attachments,
    };

    // Add country if required
    if (SERVICES_REQUIRING_COUNTRY.includes(formData.service) && formData.country) {
      ticketData.country = formData.country;
    }

    // Add outbound call data if applicable
    if (formData.service === 'outbound_calls') {
      ticketData.outboundCallData = {
        examples: outboundCallData.examples.filter(
          example => example.number.trim() && (typeof example.callDate === 'string' ? example.callDate.trim() : example.callDate)
        )
      };
    }

    // Add selected phone numbers if applicable
    if ((formData.service === 'did_numbers' || formData.service === 'inbound_calls') && selectedPhoneNumbers.length > 0) {
      ticketData.selectedPhoneNumbers = selectedPhoneNumbers;
    }

    const result = await createTicket(ticketData);
    
    if (result) {
      const ticketId = (result as { _id?: string; id?: string })._id || (result as { _id?: string; id?: string }).id || '';
      if (onSuccess) {
        onSuccess(ticketId);
      } else {
        router.push(`/support/tickets/${ticketId}`);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getCountryName = (countryCode: string) => {
    return countries.find(c => c.code === countryCode)?.name || countryCode;
  };

  const getPriorityIcon = (priority: TicketPriority) => {
    switch (priority) {
      case 'urgent':
        return <Zap className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <Card className="border-0 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent">
        <CardContent className="p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Create Support Ticket</h2>
              <p className="text-muted-foreground">We're here to help! Describe your issue and we'll get back to you soon.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <Alert variant="destructive" className="border-0 bg-destructive/5 dark:bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Title Section */}
        <Card className="border-0 bg-card/50 backdrop-blur-sm shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <Label htmlFor="title" className="text-lg font-semibold">
                  What's the issue? <span className="text-destructive">*</span>
                </Label>
              </div>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Brief, clear summary of your issue..."
                className={`h-12 text-base border-0 bg-background/60 backdrop-blur-sm hover:bg-background/80 focus:bg-background transition-all duration-200 ${
                  validationErrors.title ? 'ring-2 ring-destructive' : ''
                }`}
              />
              {validationErrors.title && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {validationErrors.title}
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">Keep it concise but descriptive</p>
                <span className={`font-mono ${formData.title.length > 180 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {formData.title.length}/200
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service and Priority Section */}
        <Card className="border-0 bg-card/50 backdrop-blur-sm shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <h3 className="text-lg font-semibold">Categorize Your Request</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Service */}
                <div className="space-y-3">
                  <Label htmlFor="service" className="text-base font-medium">
                    Related Service <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.service}
                    onValueChange={(value) => handleInputChange('service', value)}
                  >
                    <SelectTrigger className={`h-12 border-0 bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-all duration-200 ${
                      validationErrors.service ? 'ring-2 ring-destructive' : ''
                    }`}>
                      <SelectValue placeholder="Choose the service this relates to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-primary/60 rounded-full"></div>
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.service && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {validationErrors.service}
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-3">
                  <Label htmlFor="priority" className="text-base font-medium">
                    Priority Level <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleInputChange('priority', value as TicketPriority)}
                  >
                    <SelectTrigger className={`h-12 border-0 bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-all duration-200 ${
                      validationErrors.priority ? 'ring-2 ring-destructive' : ''
                    }`}>
                      <SelectValue placeholder="How urgent is this issue?" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="py-3">
                          <div className="flex items-center gap-3">
                            {getPriorityIcon(value as TicketPriority)}
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.priority && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {validationErrors.priority}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service-Specific Fields */}
        {(SERVICES_REQUIRING_COUNTRY.includes(formData.service) || 
          formData.service === 'outbound_calls' || 
          formData.service === 'did_numbers' || 
          formData.service === 'inbound_calls') && (
          <Card className="border-0 bg-card/50 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <h3 className="text-lg font-semibold">Service-Specific Information</h3>
                </div>

                {/* Country Selection */}
                {SERVICES_REQUIRING_COUNTRY.includes(formData.service) && (
                  <div className="space-y-3">
                    <Label htmlFor="country" className="text-base font-medium">
                      <Globe className="h-4 w-4 inline mr-2" />
                      Country <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => handleInputChange('country', value)}
                    >
                      <SelectTrigger className={`h-12 border-0 bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-all duration-200 ${
                        validationErrors.country ? 'ring-2 ring-destructive' : ''
                      }`}>
                        <SelectValue placeholder="Select the country for this service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCountries ? (
                          <div className="flex items-center justify-center p-3">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading countries...
                          </div>
                        ) : (
                          countries.map((country) => (
                            <SelectItem key={country.code} value={country.code} className="py-3">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                  {country.code}
                                </span>
                                {country.name}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {validationErrors.country && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {validationErrors.country}
                      </div>
                    )}
                  </div>
                )}

                {/* Outbound Call Examples */}
                {formData.service === 'outbound_calls' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        <PhoneCall className="h-4 w-4 inline mr-2" />
                        Call Examples <span className="text-destructive">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCallExample}
                        className="border-0 bg-background/60 hover:bg-background/80"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Example
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Please provide examples of numbers you tried to call and when, to help us troubleshoot.
                    </p>
                    
                    <div className="space-y-4">
                      {outboundCallData.examples.map((example, index) => (
                        <div key={index} className="p-4 bg-background/30 rounded-xl border border-border/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Phone Number</Label>
                              <Input
                                value={example.number}
                                onChange={(e) => updateCallExample(index, 'number', e.target.value)}
                                placeholder="+1234567890"
                                className="h-10 border-0 bg-background/60"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Call Date & Time</Label>
                              <Input
                                type="datetime-local"
                                value={typeof example.callDate === 'string' ? example.callDate : example.callDate?.toISOString().slice(0, 16) || ''}
                                onChange={(e) => updateCallExample(index, 'callDate', e.target.value)}
                                className="h-10 border-0 bg-background/60"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Description (Optional)</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={example.description}
                                  onChange={(e) => updateCallExample(index, 'description', e.target.value)}
                                  placeholder="Call outcome, error message..."
                                  className="h-10 border-0 bg-background/60"
                                />
                                {outboundCallData.examples.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCallExample(index)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {validationErrors.outboundCallData && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {validationErrors.outboundCallData}
                      </div>
                    )}
                  </div>
                )}

                {/* Assigned Numbers Display */}
                {(formData.service === 'did_numbers' || formData.service === 'inbound_calls') && (
                  <div className="space-y-4">
                    <Label className="text-base font-medium">
                      <Hash className="h-4 w-4 inline mr-2" />
                      Your Assigned Numbers
                      {formData.country && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          (filtered by {getCountryName(formData.country)})
                        </span>
                      )}
                    </Label>
                    
                    {loadingNumbers ? (
                      <div className="flex items-center justify-center gap-3 p-8 bg-muted/20 rounded-xl">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Loading your numbers...</span>
                      </div>
                    ) : assignedNumbers.length === 0 ? (
                      <div className="p-8 bg-muted/20 rounded-xl text-center">
                        <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {formData.country 
                            ? `No numbers assigned to your account in ${getCountryName(formData.country)}.`
                            : 'No numbers assigned to your account.'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Contact support if you need numbers assigned.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Select the phone numbers related to your issue:
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={selectAllPhoneNumbers}
                              disabled={assignedNumbers.length === 0 || selectedPhoneNumbers.length === assignedNumbers.length}
                              className="text-xs"
                            >
                              Select All
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearPhoneNumberSelection}
                              disabled={selectedPhoneNumbers.length === 0}
                              className="text-xs"
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>
                        
                        {selectedPhoneNumbers.length > 0 && (
                          <div className="text-sm text-primary font-medium">
                            {selectedPhoneNumbers.length} number{selectedPhoneNumbers.length !== 1 ? 's' : ''} selected
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                          {assignedNumbers.map((number, index) => {
                            const isSelected = selectedPhoneNumbers.includes(number.number);
                            return (
                              <div 
                                key={index} 
                                className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                                  isSelected 
                                    ? 'bg-primary/10 border-primary/50 shadow-sm' 
                                    : 'bg-background/60 border-border/50 hover:bg-background/80'
                                }`}
                                onClick={() => togglePhoneNumberSelection(number.number)}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePhoneNumberSelection(number.number)}
                                    className="mt-1 rounded border-border/50 text-primary focus:ring-primary/20 focus:ring-offset-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-mono text-sm font-medium text-foreground break-all">
                                      {number.number}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="text-xs text-muted-foreground truncate">
                                        {number.country} • {number.type}
                                      </span>
                                    </div>
                                    {number.capabilities && number.capabilities.length > 0 && (
                                      <div className="flex gap-1 mt-2 flex-wrap">
                                        {number.capabilities.map((capability, capIndex) => (
                                          <span 
                                            key={capIndex} 
                                            className="text-xs bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground"
                                          >
                                            {capability}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {number.description && (
                                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {number.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description Section */}
        <Card className="border-0 bg-card/50 backdrop-blur-sm shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <Label htmlFor="description" className="text-lg font-semibold">
                  Tell us more about the issue <span className="text-destructive">*</span>
                </Label>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Please provide as much detail as possible:&#10;• What were you trying to do?&#10;• What happened instead?&#10;• When did this start?&#10;• Are there any error messages?&#10;• Steps to reproduce the issue..."
                rows={8}
                className={`text-base border-0 bg-background/60 backdrop-blur-sm hover:bg-background/80 focus:bg-background transition-all duration-200 resize-none ${
                  validationErrors.description ? 'ring-2 ring-destructive' : ''
                }`}
              />
              {validationErrors.description && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {validationErrors.description}
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">The more details you provide, the faster we can help!</p>
                <span className={`font-mono ${formData.description.length > 1800 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {formData.description.length}/2000
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <Card className="border-0 bg-card/50 backdrop-blur-sm shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <Label className="text-lg font-semibold">Attachments</Label>
                <span className="text-sm text-muted-foreground">(Optional)</span>
              </div>
              
              <div className="border-2 border-dashed border-border/50 rounded-xl p-8 bg-gradient-to-br from-muted/20 to-muted/5 hover:from-muted/30 hover:to-muted/10 transition-all duration-300 group">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mt-6">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                        Drop files here or click to upload
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                        className="sr-only"
                        onChange={handleFileUpload}
                        disabled={uploadingFiles}
                      />
                    </label>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Screenshots, documents, logs, etc. • PNG, JPG, PDF, DOC, TXT • Up to 10MB each • Max 5 files
                    </p>
                  </div>
                </div>
              </div>

              {uploadingFiles && (
                <div className="flex items-center justify-center gap-3 p-4 bg-primary/5 rounded-xl">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">Uploading files...</span>
                </div>
              )}

              {/* Enhanced Attachment List */}
              {attachments.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <PaperclipIcon className="h-4 w-4 text-primary" />
                    <span className="text-base font-medium">Uploaded Files ({attachments.length})</span>
                  </div>
                  <div className="grid gap-3">
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-background/60 backdrop-blur-sm rounded-xl border border-border/50 hover:bg-background/80 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-muted/50 rounded-lg">
                            {getFileIcon(attachment.mimeType)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {attachment.originalName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="text-muted-foreground hover:text-destructive transition-colors duration-200"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Submit Section */}
        <Card className="border-0 bg-gradient-to-r from-card/50 to-muted/20 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground">
                  Ready to submit? We'll get back to you within 24 hours.
                </p>
              </div>
              <div className="flex items-center gap-4">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading || uploadingFiles}
                    className="min-w-[100px] border-0 bg-background/60 hover:bg-background/80"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading || uploadingFiles}
                  size="lg"
                  className="min-w-[140px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Create Ticket
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
} 