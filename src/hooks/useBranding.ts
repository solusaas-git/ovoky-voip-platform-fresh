import { useBranding as useBrandingContext } from '@/lib/BrandingContext';
import { useTheme } from 'next-themes';

// Custom hook for easier branding access throughout the app
export const useBranding = () => {
  const { settings, isLoading, error, refreshSettings, updateSettings } = useBrandingContext();
  const { theme, systemTheme } = useTheme();
  
  // Determine if we're in dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

  // Theme-aware color getters
  const getPrimaryColor = () => {
    if (isDarkMode && settings.darkPrimaryColor) {
      return settings.darkPrimaryColor;
    }
    return settings.primaryColor || '#7c3aed';
  };
  
  const getSecondaryColor = () => {
    if (isDarkMode && settings.darkSecondaryColor) {
      return settings.darkSecondaryColor;
    }
    return settings.secondaryColor || '#a855f7';
  };
  
  const getAccentColor = () => {
    if (isDarkMode && settings.darkAccentColor) {
      return settings.darkAccentColor;
    }
    return settings.accentColor || '#06b6d4';
  };
  
  const getTextColor = () => {
    if (isDarkMode && settings.darkTextColor) {
      return settings.darkTextColor;
    }
    return settings.textColor || '#1f2937';
  };
  
  const getBackgroundColor = () => {
    if (isDarkMode && settings.darkBackgroundColor) {
      return settings.darkBackgroundColor;
    }
    return settings.backgroundColor || '#ffffff';
  };
  
  const getSurfaceColor = () => {
    if (isDarkMode && settings.darkSurfaceColor) {
      return settings.darkSurfaceColor;
    }
    return settings.surfaceColor || '#f9fafb';
  };
  
  const getAuthFormBackgroundColor = () => {
    if (isDarkMode && settings.darkAuthFormBackgroundColor) {
      return settings.darkAuthFormBackgroundColor;
    }
    return settings.authFormBackgroundColor || '#ffffff';
  };

  // Helper functions for common branding needs
  const getCompanyName = () => settings.companyName || 'Sippy Communications';
  const getCompanySlogan = () => settings.companySlogan || 'Powerful Communication Management Platform';
  const getLogoUrl = () => {
    // Use dark logo in dark mode if available, otherwise fall back to regular logo
    if (isDarkMode && settings.darkLogoUrl) {
      return settings.darkLogoUrl;
    }
    return settings.logoUrl;
  };
  const getLogoAltText = () => settings.logoAltText || `${getCompanyName()} Logo`;
  const getSupportEmail = () => settings.supportEmail || 'support@sippy.com';
  const getContactEmail = () => settings.contactEmail || settings.supportEmail || 'contact@sippy.com';
  const getWebsiteUrl = () => settings.websiteUrl;

  // Helper for gradient styles
  const getGradientStyle = () => {
    if (!settings.enableGradientBackground) return {};
    
    return {
      background: `linear-gradient(135deg, ${settings.gradientStartColor || '#7c3aed'} 0%, ${settings.gradientMiddleColor || '#a855f7'} 50%, ${settings.gradientEndColor || '#3b82f6'} 100%)`
    };
  };

  // Helper for glass morphism styles
  const getGlassMorphismStyle = () => {
    if (!settings.enableGlassMorphism) return {};
    
    return {
      backdropFilter: 'blur(10px)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    };
  };

  // Helper for social links
  const getSocialLinks = () => settings.socialLinks || {};

  // Helper for theme-aware email subjects
  const getEmailSubject = (baseSubject: string) => {
    return `${baseSubject} - ${getCompanyName()}`;
  };

  // Helper for support email link
  const getSupportEmailLink = (subject?: string) => {
    const email = getSupportEmail();
    const defaultSubject = subject || 'Support Request';
    return `mailto:${email}?subject=${encodeURIComponent(getEmailSubject(defaultSubject))}`;
  };

  // Quick access objects
  const company = {
    name: getCompanyName(),
    slogan: getCompanySlogan(),
    logoUrl: getLogoUrl(),
    logoAltText: getLogoAltText(),
    supportEmail: getSupportEmail(),
    contactEmail: getContactEmail(),
    websiteUrl: getWebsiteUrl(),
  };

  const colors = {
    primary: getPrimaryColor(),
    secondary: getSecondaryColor(),
    accent: getAccentColor(),
    background: getBackgroundColor(),
    surface: getSurfaceColor(),
    text: getTextColor(),
    authFormBackground: getAuthFormBackgroundColor(),
  };

  return {
    // Core data
    settings,
    company,
    isLoading,
    error,

    // Theme-aware colors (new - use these for text content)
    colors,
    
    // Legacy color properties (maintain backward compatibility)
    primaryColor: getPrimaryColor(),
    secondaryColor: getSecondaryColor(),
    accentColor: getAccentColor(),

    // Helper functions
    getCompanyName,
    getCompanySlogan,
    getLogoUrl,
    getLogoAltText,
    getPrimaryColor,
    getSecondaryColor,
    getAccentColor,
    getTextColor,
    getBackgroundColor,
    getSurfaceColor,
    getAuthFormBackgroundColor,
    getSupportEmail,
    getContactEmail,
    getWebsiteUrl,
    getSocialLinks,
    getGradientStyle,
    getGlassMorphismStyle,
    getSupportEmailLink,

    // Theme utilities
    isDarkMode,

    // Features
    features: {
      animations: settings.enableAnimations !== false,
      glassMorphism: settings.enableGlassMorphism !== false,
      gradientBackground: settings.enableGradientBackground !== false,
    },

    // Actions
    refreshSettings,
    updateSettings,
  };
}; 