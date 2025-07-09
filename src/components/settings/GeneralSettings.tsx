'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Languages, Settings, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { LOCALE_NAMES, LOCALE_FLAGS } from '@/lib/i18n';

interface LanguageSettings {
  defaultLanguage: 'en' | 'fr';
  availableLanguages: ('en' | 'fr')[];
  enforceLanguage: boolean;
}

const LANGUAGES = [
  { code: 'en' as const, name: LOCALE_NAMES.en, flag: LOCALE_FLAGS.en },
  { code: 'fr' as const, name: LOCALE_NAMES.fr, flag: LOCALE_FLAGS.fr }
] as const;

export function GeneralSettings() {
  const [settings, setSettings] = useState<LanguageSettings>({
    defaultLanguage: 'en',
    availableLanguages: ['en', 'fr'],
    enforceLanguage: false
  });
  const [originalSettings, setOriginalSettings] = useState<LanguageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate if settings have changed
  const hasChanges = originalSettings && JSON.stringify(settings) !== JSON.stringify(originalSettings);

  // Fetch current settings
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/language-settings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch language settings');
      }
      
      const data = await response.json();
      setSettings(data);
      setOriginalSettings(data);
    } catch (error) {
      console.error('Error fetching language settings:', error);
      toast.error('Failed to load language settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Save settings
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/admin/language-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save language settings');
      }
      
      const updatedSettings = await response.json();
      setSettings(updatedSettings);
      setOriginalSettings(updatedSettings);
      
      toast.success('Language settings saved successfully');
    } catch (error) {
      console.error('Error saving language settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save language settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset settings
  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      toast.info('Settings reset to saved values');
    }
  };

  // Handle language availability toggle
  const handleLanguageToggle = (language: 'en' | 'fr', enabled: boolean) => {
    const newAvailableLanguages = enabled
      ? [...settings.availableLanguages, language]
      : settings.availableLanguages.filter(lang => lang !== language);
    
    // Ensure at least one language is available
    if (newAvailableLanguages.length === 0) {
      toast.error('At least one language must be available');
      return;
    }
    
    // If disabling the default language, change default to another available language
    let newDefaultLanguage = settings.defaultLanguage;
    if (!enabled && language === settings.defaultLanguage) {
      newDefaultLanguage = newAvailableLanguages[0];
    }
    
    setSettings({
      ...settings,
      availableLanguages: newAvailableLanguages,
      defaultLanguage: newDefaultLanguage
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Languages className="h-5 w-5" />
            <span>Language Settings</span>
          </CardTitle>
          <CardDescription>
            Configure the default language and available languages for the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Language */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Default Language</Label>
            <p className="text-sm text-muted-foreground">
              The default language for new users and the application interface
            </p>
            <Select
              value={settings.defaultLanguage}
              onValueChange={(value: 'en' | 'fr') => 
                setSettings({ ...settings, defaultLanguage: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES
                  .filter(lang => settings.availableLanguages.includes(lang.code))
                  .map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      <div className="flex items-center space-x-2">
                        <span>{language.flag}</span>
                        <span>{language.name}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Available Languages */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Available Languages</Label>
            <p className="text-sm text-muted-foreground">
              Select which languages users can choose from
            </p>
            <div className="space-y-3">
              {LANGUAGES.map((language) => {
                const isAvailable = settings.availableLanguages.includes(language.code);
                const isDefault = settings.defaultLanguage === language.code;
                
                return (
                  <div key={language.code} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{language.flag}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{language.name}</span>
                          {isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {language.code.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={isAvailable}
                      onCheckedChange={(checked) => 
                        handleLanguageToggle(language.code, checked)
                      }
                      disabled={isDefault} // Cannot disable the default language
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Enforce Language */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Enforce Language</Label>
                <p className="text-sm text-muted-foreground">
                  Prevent users from changing their language preference
                </p>
              </div>
              <Switch
                checked={settings.enforceLanguage}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, enforceLanguage: checked })
                }
              />
            </div>
          </div>

          {/* Action Buttons */}
          {hasChanges && (
            <>
              <Separator />
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  You have unsaved changes
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSaving}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 