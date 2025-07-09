import { IBrandingSettings } from '@/models/BrandingSettings';

/**
 * Apply branding colors as CSS custom properties
 * 
 * CSS Variables created:
 * --brand-primary
 * --brand-secondary
 * --brand-accent
 * --brand-background
 * --brand-surface
 * --brand-text-light
 * --brand-gradient-start
 * --brand-gradient-middle
 * --brand-gradient-end
 * --brand-auth-form-bg
 * --brand-auth-form-bg-dark
 * --brand-dark-primary
 * --brand-dark-secondary
 * --brand-dark-accent
 * --brand-dark-background
 * --brand-dark-text
 * --brand-dark-surface
 */
export function applyBrandingColors(settings: Partial<IBrandingSettings>) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  // Apply color variables
  if (settings.primaryColor) {
    root.style.setProperty('--brand-primary', settings.primaryColor);
    root.style.setProperty('--color-primary', settings.primaryColor);
  }
  
  if (settings.secondaryColor) {
    root.style.setProperty('--brand-secondary', settings.secondaryColor);
  }
  
  if (settings.accentColor) {
    root.style.setProperty('--brand-accent', settings.accentColor);
  }
  
  if (settings.backgroundColor) {
    root.style.setProperty('--brand-background', settings.backgroundColor);
  }
  
  if (settings.surfaceColor) {
    root.style.setProperty('--brand-surface', settings.surfaceColor);
  }
  
  if (settings.textColor) {
    root.style.setProperty('--brand-text-light', settings.textColor);
  }
  
  // Gradient colors
  if (settings.gradientStartColor) {
    root.style.setProperty('--brand-gradient-start', settings.gradientStartColor);
  }
  
  if (settings.gradientMiddleColor) {
    root.style.setProperty('--brand-gradient-middle', settings.gradientMiddleColor);
  }
  
  if (settings.gradientEndColor) {
    root.style.setProperty('--brand-gradient-end', settings.gradientEndColor);
  }
  
  // Auth form background colors
  if (settings.authFormBackgroundColor) {
    root.style.setProperty('--brand-auth-form-bg', settings.authFormBackgroundColor);
  }
  
  if (settings.darkAuthFormBackgroundColor) {
    root.style.setProperty('--brand-auth-form-bg-dark', settings.darkAuthFormBackgroundColor);
  }
  
  // Dark mode colors
  if (settings.darkPrimaryColor) {
    root.style.setProperty('--brand-dark-primary', settings.darkPrimaryColor);
  }
  
  if (settings.darkSecondaryColor) {
    root.style.setProperty('--brand-dark-secondary', settings.darkSecondaryColor);
  }
  
  if (settings.darkAccentColor) {
    root.style.setProperty('--brand-dark-accent', settings.darkAccentColor);
  }
  
  if (settings.darkBackgroundColor) {
    root.style.setProperty('--brand-dark-background', settings.darkBackgroundColor);
  }
  
  if (settings.darkTextColor) {
    root.style.setProperty('--brand-dark-text', settings.darkTextColor);
  }
  
  if (settings.darkSurfaceColor) {
    root.style.setProperty('--brand-dark-surface', settings.darkSurfaceColor);
  }
}

/**
 * Apply branding typography
 */
export function applyBrandingTypography(settings: Partial<IBrandingSettings>) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  if (settings.fontFamily) {
    root.style.setProperty('--brand-font-family', settings.fontFamily);
    root.style.setProperty('--font-sans', settings.fontFamily);
  }
  
  if (settings.headingFontFamily) {
    root.style.setProperty('--brand-heading-font-family', settings.headingFontFamily);
  }
  
  if (settings.borderRadius) {
    root.style.setProperty('--brand-border-radius', settings.borderRadius);
  }
}

/**
 * Apply branding features (animations, glass morphism, etc.)
 */
export function applyBrandingFeatures(settings: Partial<IBrandingSettings>) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  // Animation settings
  if (settings.enableAnimations === false) {
    root.classList.add('no-animations');
  } else {
    root.classList.remove('no-animations');
  }
  
  // Glass morphism
  if (settings.enableGlassMorphism === false) {
    root.classList.add('no-glass-morphism');
  } else {
    root.classList.remove('no-glass-morphism');
  }
  
  // Gradient backgrounds
  if (settings.enableGradientBackground === false) {
    root.classList.add('no-gradient-background');
  } else {
    root.classList.remove('no-gradient-background');
  }
}

/**
 * Update favicon dynamically
 */
export function updateFavicon(faviconUrl?: string) {
  if (typeof document === 'undefined' || !faviconUrl) return;

  let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = faviconUrl;
}

/**
 * Update page title with company name and slogan
 */
export function updatePageTitle(companyName?: string, companySlogan?: string, pageTitle?: string) {
  if (typeof document === 'undefined') return;

  if (companyName && companySlogan) {
    const brandTitle = `${companyName} - ${companySlogan}`;
    if (pageTitle) {
      document.title = `${pageTitle} - ${brandTitle}`;
    } else {
      document.title = brandTitle;
    }
  } else if (companyName) {
    if (pageTitle) {
      document.title = `${pageTitle} - ${companyName}`;
    } else {
      document.title = companyName;
    }
  } else if (companySlogan) {
    if (pageTitle) {
      document.title = `${pageTitle} - ${companySlogan}`;
    } else {
      document.title = companySlogan;
    }
  }
}

/**
 * Apply custom CSS
 */
export function applyCustomCSS(customCss?: string) {
  if (typeof document === 'undefined') return;

  let customStyleElement = document.getElementById('brand-custom-css');
  
  if (customCss) {
    if (!customStyleElement) {
      customStyleElement = document.createElement('style');
      customStyleElement.id = 'brand-custom-css';
      document.head.appendChild(customStyleElement);
    }
    customStyleElement.textContent = customCss;
  } else if (customStyleElement) {
    customStyleElement.remove();
  }
}

/**
 * Get gradient style object for inline styles
 */
export function getGradientStyle(settings: Partial<IBrandingSettings>) {
  if (!settings.enableGradientBackground) return {};
  
  return {
    background: `linear-gradient(135deg, ${settings.gradientStartColor || '#7c3aed'} 0%, ${settings.gradientMiddleColor || '#a855f7'} 50%, ${settings.gradientEndColor || '#3b82f6'} 100%)`
  };
}

/**
 * Get glass morphism style object for inline styles
 */
export function getGlassMorphismStyle(settings: Partial<IBrandingSettings>) {
  if (!settings.enableGlassMorphism) return {};
  
  return {
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  };
}

/**
 * Generate email-safe inline styles for branding
 */
export function getEmailBrandingStyles(settings: Partial<IBrandingSettings>) {
  return {
    primaryColor: settings.primaryColor || '#7c3aed',
    secondaryColor: settings.secondaryColor || '#a855f7',
    accentColor: settings.accentColor || '#06b6d4',
    fontFamily: settings.fontFamily || 'Arial, Helvetica, sans-serif',
    companyName: settings.companyName || 'Sippy Communications',
    companySlogan: settings.companySlogan || '',
    supportEmail: settings.supportEmail || 'support@example.com',
    websiteUrl: settings.websiteUrl || '#',
    backgroundColor: settings.backgroundColor || '#ffffff',
    textColor: settings.textColor || '#1f2937',
    surfaceColor: settings.surfaceColor || '#f9fafb',
  };
}

/**
 * Apply all branding settings at once
 */
export function applyAllBranding(settings: Partial<IBrandingSettings>) {
  applyBrandingColors(settings);
  applyBrandingTypography(settings);
  applyBrandingFeatures(settings);
  updateFavicon(settings.faviconUrl);
  updatePageTitle(settings.companyName, settings.companySlogan);
  applyCustomCSS(settings.customCss);
} 