'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/ui/brand-logo';
import FuzzyText from '@/components/ui/FuzzyText';
import { ArrowLeft, Home, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [hoverIntensity] = useState(0.5);
  const [enableHover] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <BrandLogo className="h-8" />
      </div>

      {/* Main Content */}
      <div className="text-center z-10 max-w-4xl mx-auto">
        {/* Main 404 with Fuzzy Effect */}
        <div className="mb-8">
          <FuzzyText 
            baseIntensity={0.2} 
            hoverIntensity={hoverIntensity} 
            enableHover={enableHover}
            fontSize="clamp(4rem, 15vw, 12rem)"
            fontWeight={900}
            color="#ffffff"
          >
            404
          </FuzzyText>
        </div>

        {/* Subtitle */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-semibold text-purple-300 mb-2">
            Page Not Found
          </h2>
          <p className="text-purple-400/80 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          
          <Button
            onClick={() => router.push('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Home Page
          </Button>
          
          <Button
            onClick={() => router.push('/support')}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
          >
            <Search className="w-4 h-4 mr-2" />
            Get Help
          </Button>
        </div>
      </div>
    </div>
  );
} 