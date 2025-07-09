'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { IBrandingSettings } from '@/models/BrandingSettings';
import { applyAllBranding } from './brandingUtils';

// Default branding settings
const defaultBrandingSettings: Partial<IBrandingSettings> = {
  companyName: 'Sippy Communications',
  companySlogan: 'Powerful Communication Management Platform',
  primaryColor: '#7c3aed',
  secondaryColor: '#a855f7',
  accentColor: '#06b6d4',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  surfaceColor: '#f9fafb',
  
  // Dark Mode Colors
  darkPrimaryColor: '#a78bfa',     // violet-400 (lighter for dark mode)
  darkSecondaryColor: '#c084fc',   // purple-400 (lighter for dark mode)
  darkAccentColor: '#22d3ee',      // cyan-400 (lighter for dark mode)
  darkBackgroundColor: '#0f172a',  // slate-900
  darkTextColor: '#f1f5f9',        // slate-100
  darkSurfaceColor: '#1e293b',     // slate-800
  
  gradientStartColor: '#7c3aed',
  gradientMiddleColor: '#a855f7',
  gradientEndColor: '#3b82f6',
  
  // Auth Form Background Colors
  authFormBackgroundColor: '#ffffff',
  darkAuthFormBackgroundColor: '#0f172a',
  
  fontFamily: 'Inter, sans-serif',
  headingFontFamily: 'Inter, sans-serif',
  borderRadius: '0.75rem',
  shadowIntensity: 'medium' as const,
  enableAnimations: true,
  enableGlassMorphism: true,
  enableGradientBackground: true,
  logoAltText: 'Company Logo',
  customCss: '',
};

// Branding context interface
interface BrandingContextType {
  settings: Partial<IBrandingSettings>;
  isLoading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (updates: Partial<IBrandingSettings>) => Promise<void>;
  applyBrandingToPage: () => void;
}

// Create context
const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Custom hook to use branding context
export const useBranding = (): BrandingContextType => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

// Branding provider props
interface BrandingProviderProps {
  children: ReactNode;
}

// CSS variable names mapping
const cssVariableMap = {
  primaryColor: '--brand-primary',
  secondaryColor: '--brand-secondary',
  accentColor: '--brand-accent',
  backgroundColor: '--brand-background',
  textColor: '--brand-text',
  surfaceColor: '--brand-surface',
  gradientStartColor: '--brand-gradient-start',
  gradientMiddleColor: '--brand-gradient-middle',
  gradientEndColor: '--brand-gradient-end',
  fontFamily: '--brand-font-family',
  headingFontFamily: '--brand-heading-font-family',
  borderRadius: '--brand-border-radius',
};

// Branding provider component
export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Partial<IBrandingSettings>>(defaultBrandingSettings);
  const [isLoading, setIsLoading] = useState(true); // Show loading until branding is ready
  const [error, setError] = useState<string | null>(null);

  // Apply branding immediately after mount
  React.useLayoutEffect(() => {
    // Apply default branding synchronously before any render
    applyAllBranding(defaultBrandingSettings);
    
    // Fetch actual branding settings
    fetchSettings();
  }, []);

  // Fetch branding settings from API
  const fetchSettings = async (): Promise<void> => {
    try {
      setError(null);

      const response = await fetch('/api/settings/branding');
      
      if (!response.ok) {
        throw new Error('Failed to fetch branding settings');
      }

      const data = await response.json();
      const newSettings = { ...defaultBrandingSettings, ...data };
      
      // Apply settings immediately when received
      setSettings(newSettings);
      applyAllBranding(newSettings);
      
      // Add minimal loading time to ensure smooth experience
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Use default settings on error
      setSettings(defaultBrandingSettings);
      applyAllBranding(defaultBrandingSettings);
      
      // Add minimum loading time even on error
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsLoading(false); // Hide loading when done
    }
  };

  // Update branding settings
  const updateSettings = async (updates: Partial<IBrandingSettings>): Promise<void> => {
    try {
      setError(null);

      const response = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      let responseData;
      
      // Try to parse JSON response
      try {
        responseData = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, get the text response for debugging
        const textResponse = await response.text();
        
        throw new Error('Server returned invalid response format. Please check the server logs.');
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status}`);
      }

      // Update local state
      setSettings(prev => ({ ...prev, ...updates }));
      
      // Apply changes immediately
      applyBrandingToPage();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Apply branding to page via CSS variables
  const applyBrandingToPage = (): void => {
    applyAllBranding(settings);
  };

  // Refresh settings
  const refreshSettings = async (): Promise<void> => {
    await fetchSettings();
  };

  const contextValue: BrandingContextType = {
    settings,
    isLoading,
    error,
    refreshSettings,
    updateSettings,
    applyBrandingToPage,
  };

  return (
    <BrandingContext.Provider value={contextValue}>
      {children}
    </BrandingContext.Provider>
  );
}; 