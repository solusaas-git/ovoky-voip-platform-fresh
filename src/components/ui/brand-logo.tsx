'use client';

import { useBranding } from '@/hooks/useBranding';
import { Phone } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export function BrandLogo({ 
  size = 'md', 
  showText = true, 
  className = '',
  iconClassName = '',
  textClassName = ''
}: BrandLogoProps) {
  const { company, getLogoUrl, isDarkMode, settings } = useBranding();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeClasses = {
    sm: { 
      icon: 'w-6 h-6', 
      logo: 'h-8 w-auto max-w-24', // Larger for logos, auto width with max constraint
      text: 'text-sm', 
      container: 'space-x-2' 
    },
    md: { 
      icon: 'w-8 h-8', 
      logo: 'h-10 w-auto max-w-32', // Larger for logos
      text: 'text-base', 
      container: 'space-x-3' 
    },
    lg: { 
      icon: 'w-10 h-10', 
      logo: 'h-12 w-auto max-w-40', // Much larger for logos
      text: 'text-lg', 
      container: 'space-x-3' 
    },
    xl: { 
      icon: 'w-12 h-12', 
      logo: 'h-16 w-auto max-w-48', // Even larger for XL logos
      text: 'text-xl', 
      container: 'space-x-4' 
    },
  };

  const currentSize = sizeClasses[size];
  
  // Don't render theme-dependent content until mounted (to avoid hydration mismatch)
  const logoUrl = mounted ? getLogoUrl() : settings.logoUrl;
  const hasLogo = !!logoUrl;



  return (
    <div className={`flex items-center ${hasLogo ? 'space-x-0' : currentSize.container} ${className}`}>
      {/* Logo/Icon */}
      {logoUrl ? (
        <Image 
          src={logoUrl} 
          alt={company.logoAltText}
          width={200}
          height={80}
          className={`${currentSize.logo} object-contain ${iconClassName}`}
          key={`logo-${isDarkMode ? 'dark' : 'light'}-${logoUrl}`}
        />
      ) : (
        <div className={`${currentSize.icon} rounded-lg overflow-hidden flex items-center justify-center bg-primary ${iconClassName}`}>
          <Phone className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-6 w-6'} text-primary-foreground`} />
        </div>
      )}

      {/* Company Name - Only show when no logo is present */}
      {showText && !hasLogo && (
        <div>
          <h1 className={`font-bold text-foreground ${currentSize.text} ${textClassName}`}>
            {company.name}
          </h1>
          {size === 'lg' || size === 'xl' ? (
            <p className="text-xs text-muted-foreground">
              {company.slogan}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Convenience components for common use cases
export function BrandLogoSm(props: Omit<BrandLogoProps, 'size'>) {
  return <BrandLogo {...props} size="sm" />;
}

export function BrandLogoMd(props: Omit<BrandLogoProps, 'size'>) {
  return <BrandLogo {...props} size="md" />;
}

export function BrandLogoLg(props: Omit<BrandLogoProps, 'size'>) {
  return <BrandLogo {...props} size="lg" />;
}

export function BrandLogoXl(props: Omit<BrandLogoProps, 'size'>) {
  return <BrandLogo {...props} size="xl" />;
} 