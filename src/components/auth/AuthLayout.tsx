'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useBranding } from '@/lib/BrandingContext';
import { useBranding as useBrandingHook } from '@/hooks/useBranding';
import { useTranslations } from '@/lib/i18n';
import { Phone, BarChart3, Shield } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  inverted?: boolean;
}

export function AuthLayout({ children, title, subtitle, inverted = false }: AuthLayoutProps) {
  const { settings } = useBranding();
  const { getAuthFormBackgroundColor, getLogoUrl, company } = useBrandingHook();
  const { t } = useTranslations();

  // Don't show any content until branding is loaded to prevent FOUC
  const companyName = settings.companyName || 'Sippy Communications';
  const logoUrl = getLogoUrl(); // This handles theme-aware logo selection
  const logoAltText = company.logoAltText;
  
  // Use CSS variables directly instead of hardcoded fallbacks
  const gradientStart = settings.gradientStartColor || 'var(--brand-gradient-start)';
  const gradientMiddle = settings.gradientMiddleColor || 'var(--brand-gradient-middle)';
  const gradientEnd = settings.gradientEndColor || 'var(--brand-gradient-end)';
  const enableGradientBackground = settings.enableGradientBackground !== false;
  const enableGlassMorphism = settings.enableGlassMorphism !== false;
  const enableAnimations = settings.enableAnimations !== false;

  // Create dynamic gradient style
  const gradientStyle = enableGradientBackground 
    ? {
        background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMiddle} 50%, ${gradientEnd} 100%)`
      }
    : {
        background: gradientStart
      };

  // Animation variants for floating elements
  const floatingVariants = {
    animate: {
      y: [-20, 20, -20],
      x: [-10, 10, -10],
      rotate: [0, 360],
      transition: {
        duration: 20,
        repeat: Infinity
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 4,
        repeat: Infinity
      }
    }
  };

  // Features data with translations
  const features = [
    {
      icon: Phone,
      title: t('auth.brandingPanel.features.callManagement.title'),
      description: t('auth.brandingPanel.features.callManagement.description'),
      color: "text-cyan-800"
    },
    {
      icon: BarChart3,
      title: t('auth.brandingPanel.features.analytics.title'),
      description: t('auth.brandingPanel.features.analytics.description'),
      color: "text-emerald-800"
    },
    {
      icon: Shield,
      title: t('auth.brandingPanel.features.security.title'),
      description: t('auth.brandingPanel.features.security.description'),
      color: "text-purple-800"
    }
  ];

  // Branding Panel Component
  const BrandingPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      {/* Dynamic Gradient Background */}
      <div 
        className="absolute inset-0" 
        style={gradientStyle}
      />
      
      {/* Simplified Animated Background Elements */}
      {enableAnimations && (
        <div className="absolute inset-0">
          {/* Large Gradient Orbs */}
          <motion.div 
            className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"
            variants={pulseVariants}
            animate="animate"
          />
          <motion.div 
            className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"
            variants={pulseVariants}
            animate="animate"
            transition={{ delay: 2 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-400/15 rounded-full blur-3xl"
            variants={pulseVariants}
            animate="animate"
            transition={{ delay: 1 }}
          />

          {/* Floating Geometric Shapes */}
          <motion.div
            className="absolute top-32 right-32"
            variants={floatingVariants}
            animate="animate"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-lg rotate-45 shadow-lg" />
          </motion.div>

          <motion.div
            className="absolute bottom-32 left-40"
            variants={floatingVariants}
            animate="animate"
            transition={{ delay: 5 }}
          >
            <div className="w-12 h-12 bg-cyan-400/30 backdrop-blur-sm rounded-full shadow-lg" />
          </motion.div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center px-12 text-white">
        <motion.div
          initial={enableAnimations ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-12"
        >
          {/* Header Section */}
          <div>
            <div className="mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-white/80">{t('auth.brandingPanel.status')}</span>
              </div>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-5xl font-bold leading-tight">
                {t('auth.brandingPanel.mainTitle.line1')}
                <span className="block bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
                  {t('auth.brandingPanel.mainTitle.line2')}
                </span>
                <span className="block text-3xl text-white/90 font-medium">
                  {t('auth.brandingPanel.mainTitle.line3')}
                </span>
              </h2>
              
              <p className="text-xl text-white/85 leading-relaxed max-w-lg">
                {t('auth.brandingPanel.mainDescription')}
              </p>
            </div>
          </div>

          {/* Features Section */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="flex items-start space-x-4 group"
                initial={enableAnimations ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
                whileHover={{ x: 10 }}
              >
                <motion.div 
                  className={`flex-shrink-0 w-12 h-12 bg-white/25 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/40 group-hover:bg-white/35 group-hover:border-white/60 transition-all duration-300 shadow-lg`}
                  whileHover={{ scale: 1.1 }}
                >
                  <feature.icon className={`w-6 h-6 ${feature.color} drop-shadow-sm`} />
                </motion.div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 drop-shadow-sm">{feature.title}</h3>
                  <p className="text-white/80 text-sm leading-relaxed drop-shadow-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Enhanced Trust Indicators */}
          <motion.div 
            className="pt-8 border-t border-white/20"
            initial={enableAnimations ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Company Logos */}
                <div className="flex -space-x-2">
                  {/* Company 1 - Generic Tech */}
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-bold text-white shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${settings.primaryColor || '#7c3aed'}, ${settings.secondaryColor || '#a855f7'})` 
                    }}
                  >
                    T
                  </div>
                  {/* Company 2 - Generic Enterprise */}
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-bold text-white shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${settings.secondaryColor || '#a855f7'}, ${settings.accentColor || '#06b6d4'})` 
                    }}
                  >
                    E
                  </div>
                  {/* Company 3 - Generic Solutions */}
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-bold text-white shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${settings.accentColor || '#06b6d4'}, ${settings.primaryColor || '#7c3aed'})` 
                    }}
                  >
                    S
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-white drop-shadow-sm">{t('auth.brandingPanel.trustIndicators.userCount')}</div>
                  <div className="text-xs text-white/70 drop-shadow-sm">{t('auth.brandingPanel.trustIndicators.trustedBy')}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {[1,2,3,4,5].map((i) => (
                    <div 
                      key={i} 
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ 
                        backgroundColor: settings.accentColor || '#06b6d4'
                      }}
                    ></div>
                  ))}
                </div>
                <span className="text-sm text-white/90 drop-shadow-sm font-medium">{t('auth.brandingPanel.trustIndicators.rating')}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );

  // Form Panel Component
  const FormPanel = () => (
    <div 
      className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative min-h-screen lg:min-h-0"
      style={{ backgroundColor: getAuthFormBackgroundColor() }}
    >
      {/* Mobile Background */}
      <div 
        className="lg:hidden absolute inset-0 opacity-10" 
        style={gradientStyle}
      />
      
      {/* Simplified Background Elements for Form Side */}
      {enableAnimations && (
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 right-20 w-32 h-32 bg-violet-200/20 rounded-full blur-2xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-32 left-16 w-24 h-24 bg-purple-200/20 rounded-full blur-2xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
      )}
      
      {/* Auth Card */}
      <motion.div
        initial={enableAnimations ? { opacity: 0, x: inverted ? -20 : 20 } : { opacity: 1, x: 0 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-md relative z-10 my-auto"
      >
        {/* Form Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12">
          {/* Large Logo at Top of Auth Form */}
          <div className="text-center mb-4">
            <motion.div 
              className="w-40 h-24 sm:w-48 sm:h-32 lg:w-64 lg:h-40 flex items-center justify-center mx-auto mb-2"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={logoAltText}
                  className="w-24 h-16 sm:w-32 sm:h-20 lg:w-40 lg:h-24 object-contain"
                />
              ) : (
                <Phone className="w-16 h-16 sm:w-16 sm:h-16 lg:w-24 lg:h-24 text-gray-600 dark:text-gray-300" />
              )}
            </motion.div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{subtitle}</p>
          </div>
          
          {children}
        </div>
        
        {/* Simplified Decorative Elements */}
        {enableAnimations && (
          <>
            <motion.div 
              className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-20 blur-xl"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <motion.div 
              className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-20 blur-xl"
              animate={{
                scale: [1, 1.3, 1],
                rotate: [360, 180, 0],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </>
        )}
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-auto lg:overflow-hidden">
      {/* Conditional Layout Based on Inverted Prop */}
      {inverted ? (
        <>
          <FormPanel />
          <BrandingPanel />
        </>
      ) : (
        <>
          <BrandingPanel />
          <FormPanel />
        </>
      )}
    </div>
  );
} 