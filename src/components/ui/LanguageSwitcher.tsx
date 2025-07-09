'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations, LOCALES, LOCALE_NAMES, LOCALE_FLAGS, type Locale } from '@/lib/i18n';

interface SystemLanguageSettings {
  defaultLanguage: 'en' | 'fr';
  availableLanguages: ('en' | 'fr')[];
  enforceLanguage: boolean;
}

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'select' | 'button';
  showLabel?: boolean;
  className?: string;
}

export function LanguageSwitcher({ 
  variant = 'dropdown', 
  showLabel = false,
  className = ''
}: LanguageSwitcherProps) {
  const { locale, setLocale, isLoading } = useTranslations();
  const [systemSettings, setSystemSettings] = useState<SystemLanguageSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch system settings on mount
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        // Check if user has admin access before making the admin API call
        const userResponse = await fetch('/api/auth/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          // Only fetch admin settings if user is admin
          if (userData.user?.role === 'admin' || userData.user?.role === 'superadmin') {
            try {
              const response = await fetch('/api/admin/language-settings');
              
              if (response.ok) {
                const systemData = await response.json();
                setSystemSettings(systemData);
                return;
              }
            } catch (adminError) {
              console.error('Error fetching admin language settings:', adminError);
            }
          }
        }
        
        // Default system settings for non-admin users or if admin call fails
        setSystemSettings({
          defaultLanguage: 'en',
          availableLanguages: ['en', 'fr'],
          enforceLanguage: false
        });
        
      } catch (error) {
        console.error('Error in language switcher initialization:', error);
        // Use default settings
        setSystemSettings({
          defaultLanguage: 'en',
          availableLanguages: ['en', 'fr'],
          enforceLanguage: false
        });
      }
    };

    fetchSystemSettings();
  }, []);

  // Change language
  const changeLanguage = async (newLanguage: Locale) => {
    if (newLanguage === locale) return;

    try {
      setIsSaving(true);

      // Update local state first for immediate UI feedback
      setLocale(newLanguage);

      // Save to database
      const response = await fetch('/api/user/language-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: newLanguage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update language preference');
      }

      toast.success('Language preference updated');
      
    } catch (error) {
      console.error('Error updating language:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update language');
      // Revert on error
      setLocale(locale);
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render if system enforces language
  if (systemSettings?.enforceLanguage) {
    return null;
  }

  const availableLanguages = systemSettings?.availableLanguages || ['en', 'fr'];
  const currentLangData = {
    code: locale,
    name: LOCALE_NAMES[locale],
    flag: LOCALE_FLAGS[locale]
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        {showLabel && <span className="text-sm text-muted-foreground">Loading...</span>}
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center space-x-2 ${className}`}
            disabled={isSaving}
          >
            <Languages className="h-4 w-4" />
            <span>{currentLangData.flag}</span>
            {showLabel && <span className="hidden sm:inline">{currentLangData.name}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LOCALES
            .filter(langCode => availableLanguages.includes(langCode))
            .map((langCode) => (
              <DropdownMenuItem
                key={langCode}
                onClick={() => changeLanguage(langCode)}
                className="flex items-center justify-between cursor-pointer"
                disabled={isSaving}
              >
                <div className="flex items-center space-x-2">
                  <span>{LOCALE_FLAGS[langCode]}</span>
                  <span>{LOCALE_NAMES[langCode]}</span>
                </div>
                {locale === langCode && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'select') {
    return (
      <div className={`space-y-1 ${className}`}>
        {showLabel && (
          <label className="text-sm font-medium">Language</label>
        )}
        <Select
          value={locale}
          onValueChange={changeLanguage}
          disabled={isSaving}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              <div className="flex items-center space-x-2">
                <span>{currentLangData.flag}</span>
                <span>{currentLangData.name}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LOCALES
              .filter(langCode => availableLanguages.includes(langCode))
              .map((langCode) => (
                <SelectItem key={langCode} value={langCode}>
                  <div className="flex items-center space-x-2">
                    <span>{LOCALE_FLAGS[langCode]}</span>
                    <span>{LOCALE_NAMES[langCode]}</span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Button variant
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {LOCALES
        .filter(langCode => availableLanguages.includes(langCode))
        .map((langCode) => (
          <Button
            key={langCode}
            variant={locale === langCode ? 'default' : 'outline'}
            size="sm"
            onClick={() => changeLanguage(langCode)}
            disabled={isSaving}
            className="flex items-center space-x-1"
          >
            <span>{LOCALE_FLAGS[langCode]}</span>
            {showLabel && <span>{LOCALE_NAMES[langCode]}</span>}
          </Button>
        ))}
    </div>
  );
} 