'use client';

import { Loader2 } from 'lucide-react';

export function SimpleLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        {/* Elegant spinner with pulsing backdrop */}
        <div className="relative mb-8">
          {/* Pulsing background circle */}
          <div className="absolute inset-0 w-24 h-24 mx-auto bg-white rounded-full opacity-5 animate-pulse"></div>
          {/* Main spinner */}
          <div className="relative z-10 w-24 h-24 mx-auto flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        </div>
        
        {/* Elegant typography */}
        <div className="space-y-3">
          <div className="text-white text-lg font-light tracking-wide">
            Loading
          </div>
          
          {/* Animated dots */}
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
        
        {/* Subtle decorative elements */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-1 h-32 bg-gradient-to-b from-transparent via-white to-transparent opacity-10"></div>
        </div>
        <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className="w-1 h-32 bg-gradient-to-b from-transparent via-white to-transparent opacity-10"></div>
        </div>
      </div>
    </div>
  );
} 