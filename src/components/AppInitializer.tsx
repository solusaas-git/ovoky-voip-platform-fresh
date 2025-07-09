'use client';

import { useEffect } from 'react';
import { useBranding } from '@/lib/BrandingContext';

// Auto-initialize application services
export function AppInitializer() {
  const { isLoading } = useBranding();

  useEffect(() => {
    const hideLoadingScreen = () => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        // Add class to body to indicate app is ready
        document.body.classList.add('app-ready');
        
        // Remove the loading screen after transition
        setTimeout(() => {
          if (loadingScreen.parentNode) {
            loadingScreen.parentNode.removeChild(loadingScreen);
          }
        }, 300);
      }
    };

    // Hide loading screen once branding is loaded
    if (!isLoading) {
      // Small delay to ensure branding is applied
      setTimeout(hideLoadingScreen, 200);
    }
  }, [isLoading]);

  return null;
} 