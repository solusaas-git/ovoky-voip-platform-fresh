'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { 
  Upload, 
  Palette, 
  Type, 
  Layout, 
  Eye, 
  EyeOff, 
  Save,
  RotateCcw,
  Image as ImageIcon,
  Loader2,
  Link as LinkIcon,
  Mail
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { useBranding } from '@/lib/BrandingContext';

export function BrandingSettings() {
  const { settings, updateSettings, isLoading } = useBranding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDarkLogo, setUploadingDarkLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  
  const logoFileRef = useRef<HTMLInputElement>(null);
  const darkLogoFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

  // Local form state
  const [formData, setFormData] = useState({
    companyName: settings.companyName || '',
    companySlogan: settings.companySlogan || '',
    logoUrl: settings.logoUrl || '',
    darkLogoUrl: settings.darkLogoUrl || '',
    faviconUrl: settings.faviconUrl || '',
    logoAltText: settings.logoAltText || '',
    primaryColor: settings.primaryColor || '#7c3aed',
    secondaryColor: settings.secondaryColor || '#a855f7',
    accentColor: settings.accentColor || '#06b6d4',
    backgroundColor: settings.backgroundColor || '#ffffff',
    textColor: settings.textColor || '#1f2937',
    surfaceColor: settings.surfaceColor || '#f9fafb',
    
    // Dark Mode Colors
    darkPrimaryColor: settings.darkPrimaryColor || '#a78bfa',
    darkSecondaryColor: settings.darkSecondaryColor || '#c084fc',
    darkAccentColor: settings.darkAccentColor || '#22d3ee',
    darkBackgroundColor: settings.darkBackgroundColor || '#0f172a',
    darkTextColor: settings.darkTextColor || '#f1f5f9',
    darkSurfaceColor: settings.darkSurfaceColor || '#1e293b',
    
    gradientStartColor: settings.gradientStartColor || '#7c3aed',
    gradientMiddleColor: settings.gradientMiddleColor || '#a855f7',
    gradientEndColor: settings.gradientEndColor || '#3b82f6',
    
    // Auth Form Background Colors
    authFormBackgroundColor: settings.authFormBackgroundColor || '#ffffff',
    darkAuthFormBackgroundColor: settings.darkAuthFormBackgroundColor || '#0f172a',
    
    fontFamily: settings.fontFamily || 'Inter, sans-serif',
    headingFontFamily: settings.headingFontFamily || 'Inter, sans-serif',
    borderRadius: settings.borderRadius || '0.75rem',
    shadowIntensity: settings.shadowIntensity || 'medium',
    contactEmail: settings.contactEmail || '',
    supportEmail: settings.supportEmail || '',
    websiteUrl: settings.websiteUrl || '',
    socialLinks: {
      twitter: settings.socialLinks?.twitter || '',
      linkedin: settings.socialLinks?.linkedin || '',
      facebook: settings.socialLinks?.facebook || '',
      instagram: settings.socialLinks?.instagram || '',
    },
    customCss: settings.customCss || '',
    enableAnimations: settings.enableAnimations !== false,
    enableGlassMorphism: settings.enableGlassMorphism !== false,
    enableGradientBackground: settings.enableGradientBackground !== false,
  });

  // Handle file upload
  const handleFileUpload = async (file: File, type: 'logo' | 'darkLogo' | 'favicon') => {
    if (type === 'logo') setUploadingLogo(true);
    else if (type === 'darkLogo') setUploadingDarkLogo(true);
    else setUploadingFavicon(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/settings/branding/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      if (type === 'logo') {
        setFormData(prev => ({ ...prev, logoUrl: result.url }));
      } else if (type === 'darkLogo') {
        setFormData(prev => ({ ...prev, darkLogoUrl: result.url }));
      } else {
        setFormData(prev => ({ ...prev, faviconUrl: result.url }));
      }

      toast.success(`${type === 'logo' ? 'Logo' : type === 'darkLogo' ? 'Dark Logo' : 'Favicon'} uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else if (type === 'darkLogo') setUploadingDarkLogo(false);
      else setUploadingFavicon(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateSettings(formData);
      toast.success('Branding settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setFormData({
      companyName: 'Sippy Communications',
      companySlogan: 'Powerful Communication Management Platform',
      logoUrl: '',
      darkLogoUrl: '',
      faviconUrl: '',
      logoAltText: 'Company Logo',
      primaryColor: '#7c3aed',
      secondaryColor: '#a855f7',
      accentColor: '#06b6d4',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      surfaceColor: '#f9fafb',
      darkPrimaryColor: '#a78bfa',
      darkSecondaryColor: '#c084fc',
      darkAccentColor: '#22d3ee',
      darkBackgroundColor: '#0f172a',
      darkTextColor: '#f1f5f9',
      darkSurfaceColor: '#1e293b',
      gradientStartColor: '#7c3aed',
      gradientMiddleColor: '#a855f7',
      gradientEndColor: '#3b82f6',
      authFormBackgroundColor: '#ffffff',
      darkAuthFormBackgroundColor: '#0f172a',
      fontFamily: 'Inter, sans-serif',
      headingFontFamily: 'Inter, sans-serif',
      borderRadius: '0.75rem',
      shadowIntensity: 'medium' as const,
      contactEmail: '',
      supportEmail: '',
      websiteUrl: '',
      socialLinks: {
        twitter: '',
        linkedin: '',
        facebook: '',
        instagram: '',
      },
      customCss: '',
      enableAnimations: true,
      enableGlassMorphism: true,
      enableGradientBackground: true,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Branding Settings</h2>
          <p className="text-muted-foreground">
            Customize your application's brand identity and visual appearance.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center space-x-2"
          >
            {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{previewMode ? 'Exit Preview' : 'Preview'}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Type className="h-5 w-5" />
              <span>Company Information</span>
            </CardTitle>
            <CardDescription>
              Basic company details and messaging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <Label htmlFor="companySlogan">Company Slogan</Label>
              <Input
                id="companySlogan"
                value={formData.companySlogan}
                onChange={(e) => setFormData(prev => ({ ...prev, companySlogan: e.target.value }))}
                placeholder="Your company slogan or tagline"
              />
            </div>
          </CardContent>
        </Card>

        {/* Visual Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Visual Assets</span>
            </CardTitle>
            <CardDescription>
              Upload and manage your logo and favicon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload */}
            <div>
              <Label>Logo (Light Mode)</Label>
              <div className="flex items-center space-x-4">
                {formData.logoUrl && (
                  <img
                    src={formData.logoUrl}
                    alt="Current logo"
                    className="h-12 w-12 object-contain border rounded"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={uploadingLogo}
                  className="flex items-center space-x-2"
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>Upload Logo</span>
                </Button>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'logo');
                  }}
                />
              </div>
            </div>

            {/* Dark Logo Upload */}
            <div>
              <Label>Logo (Dark Mode)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Optional: Upload a white/light version of your logo for dark mode
              </p>
              <div className="flex items-center space-x-4">
                {formData.darkLogoUrl && (
                  <div className="h-12 w-12 bg-slate-900 rounded border p-1 flex items-center justify-center">
                    <img
                      src={formData.darkLogoUrl}
                      alt="Current dark logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => darkLogoFileRef.current?.click()}
                  disabled={uploadingDarkLogo}
                  className="flex items-center space-x-2"
                >
                  {uploadingDarkLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>Upload Dark Logo</span>
                </Button>
                <input
                  ref={darkLogoFileRef}
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'darkLogo');
                  }}
                />
              </div>
            </div>

            {/* Favicon Upload */}
            <div>
              <Label>Favicon</Label>
              <div className="flex items-center space-x-4">
                {formData.faviconUrl && (
                  <img
                    src={formData.faviconUrl}
                    alt="Current favicon"
                    className="h-8 w-8 object-contain border rounded"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => faviconFileRef.current?.click()}
                  disabled={uploadingFavicon}
                  className="flex items-center space-x-2"
                >
                  {uploadingFavicon ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>Upload Favicon</span>
                </Button>
                <input
                  ref={faviconFileRef}
                  type="file"
                  accept="image/*,.ico"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'favicon');
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="logoAltText">Logo Alt Text</Label>
              <Input
                id="logoAltText"
                value={formData.logoAltText}
                onChange={(e) => setFormData(prev => ({ ...prev, logoAltText: e.target.value }))}
                placeholder="Descriptive text for accessibility"
              />
            </div>
          </CardContent>
        </Card>

        {/* Color Scheme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Color Scheme</span>
            </CardTitle>
            <CardDescription>
              Define your brand colors and gradients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    id="primaryColor"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-12 h-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    placeholder="#7c3aed"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    id="secondaryColor"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-12 h-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    placeholder="#a855f7"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    id="accentColor"
                    value={formData.accentColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="w-12 h-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={formData.accentColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                    placeholder="#06b6d4"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="backgroundColor">Background Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    id="backgroundColor"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="w-12 h-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            <Separator />
            
            <div>
              <Label className="text-sm font-medium">Dark Mode Colors</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Colors that will be used specifically in dark mode
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="darkPrimaryColor" className="text-xs">Dark Primary</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="darkPrimaryColor"
                      value={formData.darkPrimaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkPrimaryColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.darkPrimaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkPrimaryColor: e.target.value }))}
                      placeholder="#a78bfa"
                      className="text-xs"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="darkSecondaryColor" className="text-xs">Dark Secondary</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="darkSecondaryColor"
                      value={formData.darkSecondaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkSecondaryColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.darkSecondaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkSecondaryColor: e.target.value }))}
                      placeholder="#c084fc"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="darkAccentColor" className="text-xs">Dark Accent</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="darkAccentColor"
                      value={formData.darkAccentColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkAccentColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.darkAccentColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkAccentColor: e.target.value }))}
                      placeholder="#22d3ee"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="darkTextColor" className="text-xs">Dark Text</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="darkTextColor"
                      value={formData.darkTextColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkTextColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.darkTextColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkTextColor: e.target.value }))}
                      placeholder="#f1f5f9"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="darkBackgroundColor" className="text-xs">Dark Background</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="darkBackgroundColor"
                      value={formData.darkBackgroundColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkBackgroundColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.darkBackgroundColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkBackgroundColor: e.target.value }))}
                      placeholder="#0f172a"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="darkSurfaceColor" className="text-xs">Dark Surface</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="darkSurfaceColor"
                      value={formData.darkSurfaceColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkSurfaceColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.darkSurfaceColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkSurfaceColor: e.target.value }))}
                      placeholder="#1e293b"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium">Gradient Colors (for auth pages)</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="gradientStartColor" className="text-xs">Start</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="gradientStartColor"
                      value={formData.gradientStartColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradientStartColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.gradientStartColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradientStartColor: e.target.value }))}
                      className="text-xs"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="gradientMiddleColor" className="text-xs">Middle</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="gradientMiddleColor"
                      value={formData.gradientMiddleColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradientMiddleColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.gradientMiddleColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradientMiddleColor: e.target.value }))}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="gradientEndColor" className="text-xs">End</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="gradientEndColor"
                      value={formData.gradientEndColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradientEndColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.gradientEndColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradientEndColor: e.target.value }))}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <Label className="text-sm font-medium">Auth Form Background Colors</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Background colors for the form side of authentication pages
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="authFormBackgroundColor" className="text-xs">Light Mode</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="authFormBackgroundColor"
                      value={formData.authFormBackgroundColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, authFormBackgroundColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.authFormBackgroundColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, authFormBackgroundColor: e.target.value }))}
                      placeholder="#ffffff"
                      className="text-xs"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="darkAuthFormBackgroundColor" className="text-xs">Dark Mode</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="darkAuthFormBackgroundColor"
                      value={formData.darkAuthFormBackgroundColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkAuthFormBackgroundColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.darkAuthFormBackgroundColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, darkAuthFormBackgroundColor: e.target.value }))}
                      placeholder="#0f172a"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />
          </CardContent>
        </Card>

        {/* Typography & Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Layout className="h-5 w-5" />
              <span>Typography & Layout</span>
            </CardTitle>
            <CardDescription>
              Font families and design properties
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fontFamily">Font Family</Label>
              <Input
                id="fontFamily"
                value={formData.fontFamily}
                onChange={(e) => setFormData(prev => ({ ...prev, fontFamily: e.target.value }))}
                placeholder="Inter, sans-serif"
              />
            </div>

            <div>
              <Label htmlFor="headingFontFamily">Heading Font Family</Label>
              <Input
                id="headingFontFamily"
                value={formData.headingFontFamily}
                onChange={(e) => setFormData(prev => ({ ...prev, headingFontFamily: e.target.value }))}
                placeholder="Inter, sans-serif"
              />
            </div>

            <div>
              <Label htmlFor="borderRadius">Border Radius</Label>
              <Input
                id="borderRadius"
                value={formData.borderRadius}
                onChange={(e) => setFormData(prev => ({ ...prev, borderRadius: e.target.value }))}
                placeholder="0.75rem"
              />
            </div>

            <div>
              <Label htmlFor="shadowIntensity">Shadow Intensity</Label>
              <Select
                value={formData.shadowIntensity}
                onValueChange={(value: 'light' | 'medium' | 'heavy') => 
                  setFormData(prev => ({ ...prev, shadowIntensity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="heavy">Heavy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Contact Information</span>
            </CardTitle>
            <CardDescription>
              Business contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="contact@yourcompany.com"
              />
            </div>

            <div>
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={formData.supportEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, supportEmail: e.target.value }))}
                placeholder="support@yourcompany.com"
              />
            </div>

            <div>
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://yourcompany.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LinkIcon className="h-5 w-5" />
              <span>Social Media</span>
            </CardTitle>
            <CardDescription>
              Social media profile links
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="twitter">Twitter</Label>
              <Input
                id="twitter"
                type="url"
                value={formData.socialLinks.twitter}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                }))}
                placeholder="https://twitter.com/yourcompany"
              />
            </div>

            <div>
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                type="url"
                value={formData.socialLinks.linkedin}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  socialLinks: { ...prev.socialLinks, linkedin: e.target.value }
                }))}
                placeholder="https://linkedin.com/company/yourcompany"
              />
            </div>

            <div>
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                type="url"
                value={formData.socialLinks.facebook}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  socialLinks: { ...prev.socialLinks, facebook: e.target.value }
                }))}
                placeholder="https://facebook.com/yourcompany"
              />
            </div>

            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                type="url"
                value={formData.socialLinks.instagram}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                }))}
                placeholder="https://instagram.com/yourcompany"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Design Options */}
      <Card>
        <CardHeader>
          <CardTitle>Design Options</CardTitle>
          <CardDescription>
            Toggle various design features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Animations</Label>
              <p className="text-sm text-muted-foreground">Smooth transitions and micro-interactions</p>
            </div>
            <Switch
              checked={formData.enableAnimations}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableAnimations: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Glass Morphism</Label>
              <p className="text-sm text-muted-foreground">Semi-transparent glass-like effects</p>
            </div>
            <Switch
              checked={formData.enableGlassMorphism}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableGlassMorphism: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Gradient Backgrounds</Label>
              <p className="text-sm text-muted-foreground">Colorful gradient backgrounds on auth pages</p>
            </div>
            <Switch
              checked={formData.enableGradientBackground}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableGradientBackground: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom CSS */}
      <Card>
        <CardHeader>
          <CardTitle>Custom CSS</CardTitle>
          <CardDescription>
            Add custom CSS for advanced styling (use with caution)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.customCss}
            onChange={(e) => setFormData(prev => ({ ...prev, customCss: e.target.value }))}
            placeholder="/* Custom CSS rules */"
            rows={8}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center space-x-2"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
        </Button>
      </div>
    </form>
  );
} 