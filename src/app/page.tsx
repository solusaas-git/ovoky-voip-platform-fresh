'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useBranding } from '@/hooks/useBranding';
import { useTranslations } from '@/lib/i18n';
import { SimpleLoadingScreen } from '@/components/SimpleLoadingScreen';
import AnimatedContent from '@/components/AnimatedContent';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Lazy load heavy components for better LCP
const Aurora = lazy(() => import('@/components/Aurora'));

import { 
  Phone, 
  MessageSquare, 
  BarChart3, 
  Shield, 
  Globe, 
  Zap,
  Users,
  Settings,
  PhoneCall,
  ArrowRight,
  CheckCircle,
  Star,
  Play,
  Menu,
  X,
  Bot,
  Database,
  Lock,
  Code,
  Headphones,
  TrendingUp,
  Clock,
  Award,
  LogIn,
  UserPlus,
  Rocket,
  Funnel,
  MessageCircle,
  Calculator,
  Mail,
  Smartphone,
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Wrapper for easy section animations
const AnimatedSection = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  return (
    <AnimatedContent
      distance={100}
      direction="vertical"
      duration={1.0}
      ease="power3.out"
      delay={delay}
      threshold={0.3}
    >
      <div className={className}>
        {children}
      </div>
    </AnimatedContent>
  );
};

export default function LandingPage() {
  const { settings, isLoading } = useBranding();
  const { t, isLoading: translationsLoading } = useTranslations();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [featuresOffset, setFeaturesOffset] = useState(800);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('calls');
  const [auroraLoaded, setAuroraLoaded] = useState(false);
  
  // Touch/swipe state for mobile tabs
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Preload critical images for better LCP
  useEffect(() => {
    const criticalImages = [
      '/providers-logos/Orange.png',
      '/providers-logos/t-mobile.png',
      '/providers-logos/O2.png',
      '/providers-logos/Proximus.png'
    ];

    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });

    // Load Aurora after critical content is rendered
    const timer = setTimeout(() => {
      setAuroraLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Configure GSAP ScrollTrigger for smooth scrolling - delay for better LCP
  useEffect(() => {
    const timer = setTimeout(() => {
    const { gsap } = require('gsap');
    const { ScrollTrigger } = require('gsap/ScrollTrigger');
    
    gsap.registerPlugin(ScrollTrigger);
    
    // Global ScrollTrigger configuration for smooth performance
    ScrollTrigger.config({
      ignoreMobileResize: true,
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
    });

    // Smooth scrolling for the page
    ScrollTrigger.normalizeScroll(true);
    }, 200);
    
    return () => {
      clearTimeout(timer);
      try {
        const { ScrollTrigger } = require('gsap/ScrollTrigger');
      ScrollTrigger.killAll();
      } catch (e) {
        // GSAP not loaded yet
      }
    };
  }, []);

  // Reduced animation complexity for better LCP
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  const fadeInUpItem = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  const handleNavClick = (href: string) => {
    setIsMenuOpen(false);
    const element = document.querySelector(href);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  // Touch handlers for mobile tab swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    const container = document.getElementById('mobile-tabs-container');
    if (!container) return;

    if (isLeftSwipe) {
      // Swipe left - scroll right
      container.scrollBy({ left: 120, behavior: 'smooth' });
    }
    
    if (isRightSwipe) {
      // Swipe right - scroll left
      container.scrollBy({ left: -120, behavior: 'smooth' });
    }
  };

  // Helper function for programmatic tab scrolling
  const scrollTabs = (direction: 'left' | 'right') => {
    const container = document.getElementById('mobile-tabs-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -120 : 120;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Calculate features section offset once on mount and resize
  useEffect(() => {
    const calculateFeaturesOffset = () => {
      const featuresSection = document.querySelector('#features') as HTMLElement;
      if (featuresSection) {
        setFeaturesOffset(featuresSection.offsetTop);
      }
    };

    // Calculate on mount
    setTimeout(calculateFeaturesOffset, 100); // Small delay to ensure DOM is ready
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateFeaturesOffset);
    
    return () => window.removeEventListener('resize', calculateFeaturesOffset);
  }, []);

  // Handle scroll detection for smooth granular navigation shrinking
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Determine scroll direction
          if (currentScrollY > lastScrollY && currentScrollY > 20) {
            setIsScrollingUp(false);
          } else if (currentScrollY < lastScrollY) {
            setIsScrollingUp(true);
          }
          
          setScrollY(currentScrollY);
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);
  
  // Show loading screen until both branding and translations are ready
  if (isLoading || translationsLoading) {
    return <SimpleLoadingScreen />;
  }
  
  const companyName = settings.companyName || 'Sippy Communications';
  const companySlogan = settings.companySlogan || 'Powerful Communication Management Platform';

  const features = [
    {
      icon: <Phone className="h-8 w-8" />,
      title: "Voice Solutions",
      description: "High-quality voice calls with global coverage, competitive rates, and carrier-grade reliability",
      highlight: null,
      colors: {
        primary: "from-blue-500 to-cyan-400",
        bg: "from-blue-50 to-cyan-50",
        darkBg: "from-blue-500/30 to-cyan-500/30",
        icon: "text-blue-500",
        border: "border-blue-300/80",
        accent: "bg-blue-500"
      }
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "SMS Services",
      description: "Send and receive SMS messages worldwide with advanced routing and delivery tracking",
      highlight: null,
      colors: {
        primary: "from-green-500 to-emerald-400",
        bg: "from-green-50 to-emerald-50",
        darkBg: "from-green-500/30 to-emerald-500/30",
        icon: "text-green-500",
        border: "border-green-300/80",
        accent: "bg-green-500"
      }
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "DID Numbers",
      description: "Local and toll-free numbers in 220+ countries with instant provisioning and management",
      highlight: null,
      colors: {
        primary: "from-purple-500 to-pink-400",
        bg: "from-purple-50 to-pink-50",
        darkBg: "from-purple-500/30 to-pink-500/30",
        icon: "text-purple-500",
        border: "border-purple-300/80",
        accent: "bg-purple-500"
      }
    },
    {
      icon: <Funnel className="h-8 w-8" />,
      title: "Omnichannel Platform",
      description: "Unified communication across voice, SMS, email, and social channels in one platform",
      highlight: null,
      colors: {
        primary: "from-orange-500 to-red-400",
        bg: "from-orange-50 to-red-50",
        darkBg: "from-orange-500/30 to-red-500/30",
        icon: "text-orange-500",
        border: "border-orange-300/80",
        accent: "bg-orange-500"
      }
    },
    {
      icon: <MessageCircle className="h-8 w-8" />,
      title: "WhatsApp Business API",
      description: "Official WhatsApp Business API integration for customer engagement and support",
      highlight: null,
      colors: {
        primary: "from-indigo-500 to-blue-400",
        bg: "from-indigo-50 to-blue-50",
        darkBg: "from-indigo-500/30 to-blue-500/30",
        icon: "text-indigo-500",
        border: "border-indigo-300/80",
        accent: "bg-indigo-500"
      }
    },
    {
      icon: <Bot className="h-8 w-8" />,
      title: "AI Agents",
      description: "Intelligent AI-powered agents for automated customer service and call handling",
      highlight: null,
      colors: {
        primary: "from-teal-500 to-cyan-400",
        bg: "from-teal-50 to-cyan-50",
        darkBg: "from-teal-500/30 to-cyan-500/30",
        icon: "text-teal-500",
        border: "border-teal-300/80",
        accent: "bg-teal-500"
      }
    }
  ];

  const benefits = [
    "Reduce communication costs by up to 70%",
    "Process 800M+ minutes annually with enterprise reliability",
    "15M+ daily calls with real-time monitoring",
    "Advanced fraud protection and compliance",
    "24/7 expert support with multilevel alerting",
    "Direct carrier relationships for best rates"
  ];

  const stats = [
    { number: "99.99%", label: "Uptime SLA", subtext: "Redundant infrastructure" },
    { number: "220+", label: "Countries", subtext: "Global coverage" },
    { number: "15M+", label: "Daily Calls", subtext: "Volume capacity" },
    { number: "24/7", label: "Support", subtext: "Expert assistance" }
  ];

  const trustIndicators = [
    { icon: <Award className="h-5 w-5" />, text: "SOC 2 Type II Certified" },
    { icon: <Shield className="h-5 w-5" />, text: "GDPR Compliant" },
    { icon: <Lock className="h-5 w-5" />, text: "End-to-End Encryption" },
    { icon: <Clock className="h-5 w-5" />, text: "24/7 Monitoring" }
  ];

  // Calculate smooth granular navigation properties based on scroll position
  const getNavWidth = () => {
    // Start shrinking after 30px scroll
    const startShrink = 30;
    const maxShrink = featuresOffset - 100; // Stop shrinking 100px before features section
    
    if (scrollY <= startShrink) {
      return 1400; // Larger starting width
    }
    
    // Calculate shrinking progress (0 to 1) based on scroll to features section
    const shrinkProgress = Math.min(Math.max((scrollY - startShrink) / (maxShrink - startShrink), 0), 1);
    
    // Interpolate between 1400px (full) and 950px (larger minimum width)
    const maxWidth = 1400 - (450 * shrinkProgress); // 1400 - 450 = 950
    
    return Math.max(maxWidth, 950);
  };

  const getNavScale = () => {
    const startShrink = 30;
    const maxShrink = featuresOffset - 100;
    
    if (scrollY <= startShrink) {
      return 1;
    }
    
    const shrinkProgress = Math.min(Math.max((scrollY - startShrink) / (maxShrink - startShrink), 0), 1);
    // Very subtle scale from 1.0 to 0.995 (minimal scaling)
    return 1 - (0.005 * shrinkProgress);
  };

  const getNavPadding = () => {
    const startShrink = 30;
    const maxShrink = featuresOffset - 100;
    
    if (scrollY <= startShrink) {
      return 1.25; // Compact starting padding
    }
    
    const shrinkProgress = Math.min(Math.max((scrollY - startShrink) / (maxShrink - startShrink), 0), 1);
    // Padding from 1.25rem to 1rem (compact reduction)
    return 1.25 - (0.25 * shrinkProgress);
  };

  const getNavGap = () => {
    const startShrink = 30;
    const maxShrink = featuresOffset - 100;
    
    if (scrollY <= startShrink) {
      return 1.75; // Compact starting gap
    }
    
    const shrinkProgress = Math.min(Math.max((scrollY - startShrink) / (maxShrink - startShrink), 0), 1);
    // Gap from 1.75rem to 1.25rem (compact spacing)
    return 1.75 - (0.5 * shrinkProgress);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <motion.nav 
        className="fixed top-2 sm:top-4 left-1/2 transform -translate-x-1/2 z-50 w-full mx-auto px-2 sm:px-4 lg:px-8"
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.8, 
          ease: [0.25, 0.46, 0.45, 0.94],
          delay: 0.2
        }}
      >
        <motion.div 
          className="relative bg-background/20 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-full shadow-2xl mx-auto overflow-hidden"
          animate={{
            maxWidth: `${getNavWidth()}px`,
          }}
          transition={{
            duration: 0.1,
            ease: "linear",
          }}
          whileHover={{ 
            scale: 1.01,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            borderColor: "rgba(255, 255, 255, 0.3)"
          }}
        >
          {/* Glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/5 pointer-events-none" />
          
          {/* Subtle animated shimmer */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 2,
            }}
          />
          <motion.div 
            className="flex items-center h-12 sm:h-14 relative z-10"
            animate={{
              paddingLeft: `${getNavPadding()}rem`,
              paddingRight: `${getNavPadding()}rem`,
              scale: getNavScale(),
            }}
            transition={{
              duration: 0.1,
              ease: "linear",
            }}
          >
            {/* Brand Logo - Left */}
            <motion.div 
              className="flex items-center flex-shrink-0"
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: 1, 
                x: 0
              }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <BrandLogo className="h-5 sm:h-6 w-auto" />
            </motion.div>
            
            {/* Centered Navigation Links & Secondary CTAs - Hidden on mobile/tablet */}
            <motion.div 
              className="hidden lg:flex items-center absolute left-1/2 transform -translate-x-1/2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: getNavScale(),
              }}
              transition={{ 
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1] 
              }}
              style={{
                gap: `${getNavGap()}rem`
              }}
            >
              {[
                { text: 'Platform', action: () => handleNavClick('#features') },
                { text: 'Solutions', action: () => handleNavClick('#solutions') },
                { text: 'Pricing', action: () => handleNavClick('#pricing') }
              ].map((item, index) => (
                <motion.button 
                  key={item.text}
                  onClick={item.action} 
                  className="relative text-foreground/80 hover:text-primary transition-colors font-medium group text-sm whitespace-nowrap"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                >
                  {item.text}
                  <motion.div
                    className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary rounded-full group-hover:w-full transition-all duration-300"
                  />
                </motion.button>
              ))}
              
              <motion.a 
                href="/api-docs" 
                className="relative text-foreground/80 hover:text-primary transition-colors font-medium group text-sm whitespace-nowrap"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
              >
                Developers
                <motion.div
                  className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary rounded-full group-hover:w-full transition-all duration-300"
                />
              </motion.a>
              
              {/* Start Building CTA moved here */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.8 }}
                className="ml-2"
              >
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/register')} 
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-white/60 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 shadow-lg hover:shadow-xl transition-all duration-300 text-sm whitespace-nowrap font-medium flex items-center gap-2"
                >
                  <Rocket className="h-4 w-4" />
                  Start Building
                </Button>
              </motion.div>
            </motion.div>
              
            {/* Desktop Actions - Right Side (only Sign In and Theme Toggle) */}
              <motion.div
              className="hidden lg:flex items-center ml-auto flex-shrink-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                scale: getNavScale(),
              }}
              transition={{ 
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1] 
              }}
                style={{
                  gap: `${Math.max(getNavGap() * 0.6, 0.5)}rem`
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.9 }}
                >
                  <ThemeToggle />
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 1.0 }}
                >
                <Button size="sm" onClick={() => router.push('/login')} className="bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm flex items-center gap-2 whitespace-nowrap">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Button>
                </motion.div>
              </motion.div>
              
            {/* Mobile/Tablet Actions */}
            <motion.div 
              className="lg:hidden flex items-center ml-auto space-x-2 sm:space-x-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Mobile/Tablet Sign In Button */}
              <motion.div
                className="block"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button variant="outline" size="sm" onClick={() => router.push('/login')} className="font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 border-border/60 hover:border-primary/60 px-2 sm:px-3">
                  <LogIn className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
            </motion.div>
              
              {/* Mobile/Tablet Sign Up Button */}
            <motion.div 
                className="block"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="sm" onClick={() => router.push('/register')} className="font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 px-2 sm:px-3">
                  <Rocket className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Start</span>
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2"
                >
                  {isMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Mobile/Tablet Navigation Menu */}
        {isMenuOpen && (
          <motion.div 
            className="lg:hidden bg-background/95 backdrop-blur-md border border-border/40 rounded-2xl mt-2 mx-2 shadow-lg"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 sm:px-6 py-4 space-y-1">
              {/* Navigation Links */}
              <motion.button 
                onClick={() => {
                  handleNavClick('#features');
                  setIsMenuOpen(false);
                }} 
                className="block w-full text-left px-3 py-3 text-foreground/80 hover:text-primary font-medium rounded-lg hover:bg-muted/50 transition-all text-base"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                Platform
              </motion.button>
              <motion.button 
                onClick={() => {
                  handleNavClick('#solutions');
                  setIsMenuOpen(false);
                }} 
                className="block w-full text-left px-3 py-3 text-foreground/80 hover:text-primary font-medium rounded-lg hover:bg-muted/50 transition-all text-base"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                Solutions
              </motion.button>
              <motion.button 
                onClick={() => {
                  handleNavClick('#pricing');
                  setIsMenuOpen(false);
                }} 
                className="block w-full text-left px-3 py-3 text-foreground/80 hover:text-primary font-medium rounded-lg hover:bg-muted/50 transition-all text-base"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                Pricing
              </motion.button>
              <motion.a 
                href="/api-docs" 
                className="block px-3 py-3 text-foreground/80 hover:text-primary font-medium rounded-lg hover:bg-muted/50 transition-all text-base"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsMenuOpen(false)}
              >
                Developers
              </motion.a>
              
              {/* Divider */}
              <div className="border-t border-border/40 my-3"></div>
              
              {/* Theme Toggle */}
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground/80">Theme</span>
                  <ThemeToggle />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/40 my-3"></div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 px-3">
                {/* Sign In Button */}
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center gap-2 justify-center border-border/60 hover:border-primary/60 py-3 text-base" 
                    onClick={() => {
                      router.push('/login');
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Button>
                </motion.div>
                
                {/* Sign Up Button */}
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 py-3 text-base font-medium flex items-center gap-2 justify-center" 
                    onClick={() => {
                      router.push('/register');
                      setIsMenuOpen(false);
                    }}
                  >
                    <Rocket className="h-4 w-4" />
                    Start Free
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        {/* Aurora Background - Lazy loaded for better LCP */}
        <div className="absolute inset-0 z-0 opacity-80 dark:opacity-30">
          {auroraLoaded ? (
            <Suspense fallback={<div className="w-full h-full bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950" />}>
          <Aurora
            colorStops={["#00d4ff", "#40e0ff", "#80ebff"]}
            blend={0.9}
            amplitude={0.6}
            speed={1.2}
          />
            </Suspense>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950" />
          )}
        </div>
        
        {/* Subtle overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background/30 z-[2] pointer-events-none" />
        
        <AnimatedContent
          distance={60}
          direction="vertical"
          duration={0.8}
          ease="power2.out"
          delay={0}
          threshold={0.2}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-22 sm:pt-28 pb-14 sm:pb-18 lg:pt-36">
            <div className="text-center max-w-4xl mx-auto">

              
              <motion.h1 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-5 sm:mb-7 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                 <span className="text-white drop-shadow-lg">
                   Connect the World
                 </span>
                 <br />
                 <span className="text-white drop-shadow-lg">
                   with Confidence
                 </span>
               </motion.h1>
               
               <motion.p 
                 className="text-lg sm:text-xl lg:text-xl text-white/90 mb-5 sm:mb-7 max-w-3xl mx-auto leading-relaxed drop-shadow-md px-2"
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.3, delay: 0.2 }}
               >
                 Enterprise-grade voice calls, SMS messaging, and DID numbers with global coverage, 
                 competitive rates, and carrier-grade reliability for businesses worldwide.
               </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-7 sm:mb-9 px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Button 
                  size="lg" 
                                   onClick={() => router.push('/register')} 
                  className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-5 text-base sm:text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                 >
                  <Rocket className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                   Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                 </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => handleNavClick('#contact')}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-5 text-base sm:text-lg border-2 border-white/30 dark:border-white/30 text-slate-900 dark:text-white hover:border-primary hover:text-primary hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                >
                  <Phone className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Talk to Sales
                </Button>
              </motion.div>
            </motion.div>

            {/* Live stats - Moderately reduced size */}
            <motion.div 
              className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-7 max-w-4.5xl mx-auto mb-7 sm:mb-10 px-2"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {stats.map((stat, index) => (
                <motion.div 
                  key={index} 
                  className="text-center bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-2.5 sm:p-3.5 lg:p-5 border border-white/20 dark:border-white/10"
                  variants={fadeInUpItem}
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary mb-0.5 sm:mb-1.5 drop-shadow-lg">
                    {stat.number}
                  </div>
                  <div className="text-slate-900 dark:text-white font-semibold text-sm sm:text-sm drop-shadow-sm">{stat.label}</div>
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-white/70 drop-shadow-sm mt-0.5">{stat.subtext}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Provider Logos Carousel */}
            <motion.div 
              className="relative px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <div className="text-center mb-3.5 sm:mb-5">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 font-medium uppercase tracking-wider drop-shadow-sm">
                  Trusted by leading providers worldwide
                </p>
              </div>
              
              {/* Mobile version - adaptive colors based on theme */}
              <div className="block sm:hidden relative overflow-hidden rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-slate-200/50 dark:border-white/10">
                {/* Gradient overlays for smooth fade effect */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/60 dark:from-white/10 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/60 dark:from-white/10 to-transparent z-10 pointer-events-none" />
                
                {/* Scrolling container */}
                <div className="flex animate-scroll space-x-6 py-3.5">
                  {/* First set of logos */}
                  <div className="flex items-center space-x-6 min-w-max">
                    <img src="/providers-logos/Orange.png" alt="Orange" loading="eager" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/t-mobile.png" alt="T-Mobile" loading="eager" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/O2.png" alt="O2" loading="eager" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/Proximus.png" alt="Proximus" loading="eager" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/free.png" alt="Free" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/bouygues.webp" alt="Bouygues" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/inwi.png" alt="Inwi" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/Maroc_telecom.png" alt="Maroc Telecom" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                  </div>
                  
                  {/* Duplicate set for seamless loop */}
                  <div className="flex items-center space-x-6 min-w-max">
                    <img src="/providers-logos/Orange.png" alt="Orange" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/t-mobile.png" alt="T-Mobile" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/O2.png" alt="O2" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/Proximus.png" alt="Proximus" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/free.png" alt="Free" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/bouygues.webp" alt="Bouygues" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/inwi.png" alt="Inwi" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/Maroc_telecom.png" alt="Maroc Telecom" loading="lazy" decoding="async" className="h-5.5 w-auto opacity-80 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                  </div>
                </div>
              </div>

              {/* Desktop version - original colors */}
              <div className="hidden sm:block relative overflow-hidden rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-slate-200/50 dark:border-white/10">
                {/* Gradient overlays for smooth fade effect */}
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white/60 dark:from-white/10 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white/60 dark:from-white/10 to-transparent z-10 pointer-events-none" />
                
                {/* Scrolling container */}
                <div className="flex animate-scroll space-x-12 py-5">
                  {/* First set of logos */}
                  <div className="flex items-center space-x-12 min-w-max">
                    <img src="/providers-logos/Orange.png" alt="Orange" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/t-mobile.png" alt="T-Mobile" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/O2.png" alt="O2" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/Proximus.png" alt="Proximus" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/free.png" alt="Free" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/bouygues.webp" alt="Bouygues" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/inwi.png" alt="Inwi" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/Maroc_telecom.png" alt="Maroc Telecom" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                  </div>
                  
                  {/* Duplicate set for seamless loop */}
                  <div className="flex items-center space-x-12 min-w-max">
                    <img src="/providers-logos/Orange.png" alt="Orange" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/t-mobile.png" alt="T-Mobile" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/O2.png" alt="O2" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/Proximus.png" alt="Proximus" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/free.png" alt="Free" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/bouygues.webp" alt="Bouygues" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/inwi.png" alt="Inwi" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                    <img src="/providers-logos/Maroc_telecom.png" alt="Maroc Telecom" loading="lazy" decoding="async" className="h-7 w-auto opacity-70 hover:opacity-100 transition-all duration-300 dark:brightness-0 dark:invert" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        </AnimatedContent>
      </section>

      {/* Platform Features Section */}
      <section id="features" className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-teal-50/30 dark:from-blue-950/10 dark:via-purple-950/10 dark:to-teal-950/10 relative overflow-hidden">
        {/* Colorful Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-teal-500/5 opacity-70" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-teal-500/30" />
        
        {/* Additional colorful background elements - responsive */}
        <div className="absolute top-10 sm:top-20 left-4 sm:left-20 w-20 sm:w-40 h-20 sm:h-40 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-2xl sm:blur-3xl animate-pulse" />
        <div className="absolute bottom-10 sm:bottom-20 right-4 sm:right-20 w-32 sm:w-60 h-32 sm:h-60 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-2xl sm:blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-16 sm:w-32 h-16 sm:h-32 bg-gradient-to-r from-green-400/10 to-emerald-400/10 rounded-full blur-xl sm:blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimatedContent
            distance={80}
            direction="vertical"
            duration={0.6}
            ease="power2.out"
            delay={0}
            threshold={0.2}
          >
            <div className="text-center mb-12 sm:mb-16 lg:mb-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <Badge variant="outline" className="mb-4 sm:mb-6 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 backdrop-blur-sm shadow-lg text-sm sm:text-base">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-yellow-500" />
                             Telecom Excellence
             </Badge>
              </motion.div>
               
              <motion.h2 
                className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-6 sm:mb-8 px-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 dark:from-slate-100 dark:via-blue-100 dark:to-slate-100 bg-clip-text text-transparent">
               Complete communication
                </span>
               <br />
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">
                 infrastructure
               </span>
              </motion.h2>
              
              <motion.p 
                className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed px-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
              >
               Voice calls, SMS messaging, and DID numbers with enterprise-grade reliability, 
               global coverage, and competitive rates for businesses of all sizes.
              </motion.p>
            </div>
          </AnimatedContent>

          {/* Enhanced colorful decorative elements positioned in outer margins - responsive */}
          <div className="hidden sm:block absolute top-32 -left-12 w-24 h-24 bg-gradient-to-r from-orange-400/20 to-red-400/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '3s' }} />
          <div className="hidden sm:block absolute bottom-32 -right-16 w-36 h-36 bg-gradient-to-r from-teal-400/20 to-cyan-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />
          <div className="hidden lg:block absolute top-52 -right-8 w-16 h-16 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-full blur-lg animate-pulse" style={{ animationDelay: '5s' }} />
          <div className="hidden lg:block absolute top-72 -left-8 w-12 h-12 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-md animate-pulse" style={{ animationDelay: '6s' }} />
          <div className="hidden lg:block absolute bottom-52 -left-16 w-8 h-8 bg-gradient-to-r from-indigo-400/20 to-blue-400/20 rounded-full blur-sm animate-pulse" style={{ animationDelay: '7s' }} />
          <div className="hidden sm:block absolute top-96 -right-12 w-14 h-14 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 rounded-full blur-md animate-pulse" style={{ animationDelay: '8s' }} />
          <div className="hidden sm:block absolute bottom-72 -right-4 w-10 h-10 bg-gradient-to-r from-rose-400/20 to-pink-400/20 rounded-full blur-sm animate-pulse" style={{ animationDelay: '9s' }} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <AnimatedContent
                key={index}
                distance={100}
                direction="vertical"
                duration={0.8}
                ease="power3.out"
                delay={index * 0.1}
                threshold={0.2}
              >
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.4, ease: "backOut" }}
                  className="h-full cursor-pointer"
                  onClick={() => {
                    setActiveCardIndex(index);
                    setTimeout(() => {
                      setActiveCardIndex(null);
                    }, 2000);
                  }}
                >
                  <Card 
                    className={`group hover:shadow-2xl transition-all duration-500 bg-gradient-to-br ${feature.colors.bg} dark:bg-gradient-to-br ${
                      index === 0 ? 'dark:from-slate-800/80 dark:via-blue-900/20 dark:to-slate-900/80' :
                      index === 1 ? 'dark:from-slate-800/80 dark:via-green-900/20 dark:to-slate-900/80' :
                      index === 2 ? 'dark:from-slate-800/80 dark:via-purple-900/20 dark:to-slate-900/80' :
                      index === 3 ? 'dark:from-slate-800/80 dark:via-orange-900/20 dark:to-slate-900/80' :
                      index === 4 ? 'dark:from-slate-800/80 dark:via-indigo-900/20 dark:to-slate-900/80' :
                      'dark:from-slate-800/80 dark:via-teal-900/20 dark:to-slate-900/80'
                                         } backdrop-blur-sm h-full relative overflow-hidden border ${feature.colors.border} dark:border-opacity-30 hover:border-opacity-80 ${activeCardIndex === index ? 'shadow-2xl border-opacity-80' : ''}`}
                  >
                    {/* Colorful gradient overlay on hover and active */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.colors.primary} transition-opacity duration-500 ${activeCardIndex === index ? 'opacity-10' : 'opacity-0 group-hover:opacity-10'}`} />
                    
                    {/* Animated colorful border */}
                                          <div className={`absolute inset-0 rounded-lg transition-opacity duration-500 ${activeCardIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${feature.colors.primary} p-[1px]`}>
                        <div className={`w-full h-full rounded-lg bg-gradient-to-br ${feature.colors.bg} dark:bg-gradient-to-br ${
                          index === 0 ? 'dark:from-slate-800/80 dark:via-blue-900/20 dark:to-slate-900/80' :
                          index === 1 ? 'dark:from-slate-800/80 dark:via-green-900/20 dark:to-slate-900/80' :
                          index === 2 ? 'dark:from-slate-800/80 dark:via-purple-900/20 dark:to-slate-900/80' :
                          index === 3 ? 'dark:from-slate-800/80 dark:via-orange-900/20 dark:to-slate-900/80' :
                          index === 4 ? 'dark:from-slate-800/80 dark:via-indigo-900/20 dark:to-slate-900/80' :
                          'dark:from-slate-800/80 dark:via-teal-900/20 dark:to-slate-900/80'
                        }`} />
                      </div>
                    </div>
                    
                    <CardContent className="p-4 sm:p-6 lg:p-8 relative z-10">
                      <div className="flex items-start justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1">
                        <motion.div 
                            className="relative flex-shrink-0"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r ${feature.colors.primary} rounded-xl blur transition-opacity duration-300 ${activeCardIndex === index ? 'opacity-40' : 'opacity-20 group-hover:opacity-40'}`} />
                            <div className={`relative ${feature.colors.icon} p-3 sm:p-4 rounded-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-800/80 dark:to-slate-800/60 border-2 ${feature.colors.border} dark:border-opacity-40 transition-all duration-300 shadow-lg flex items-center justify-center ${activeCardIndex === index ? 'border-opacity-100' : 'group-hover:border-opacity-100'}`}>
                              <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex items-center justify-center">
                          {feature.icon}
                              </div>
                            </div>
                        </motion.div>
                          
                          <motion.h3 
                            className={`text-lg sm:text-xl font-bold transition-colors duration-300 flex-1 ${
                              activeCardIndex === index 
                                ? feature.colors.icon 
                                : `text-slate-900 dark:text-slate-100 group-hover:${feature.colors.icon}`
                            }`}
                            whileHover={{ x: 2 }}
                            transition={{ duration: 0.2 }}
                          >
                            {feature.title}
                          </motion.h3>
                        </div>
                        
                        {feature.highlight && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="flex-shrink-0"
                          >
                            <Badge className={`bg-gradient-to-r ${feature.colors.primary} text-white text-xs border-0 shadow-lg`}>
                            {feature.highlight}
                          </Badge>
                          </motion.div>
                        )}
                      </div>
                      
                      <p className={`text-sm sm:text-base leading-relaxed transition-colors duration-300 ${
                        activeCardIndex === index 
                          ? 'text-slate-700 dark:text-slate-200' 
                          : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                      }`}>
                        {feature.description}
                      </p>
                      
                      {/* Colorful animated bottom accent */}
                      <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${feature.colors.primary} transform origin-left transition-transform duration-500 ${
                        activeCardIndex === index ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      }`} />
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatedContent>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-12 sm:py-16 lg:py-20 bg-slate-900 dark:bg-slate-950 relative overflow-hidden">
        {/* Geometric Pattern Background - responsive */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-800 via-transparent to-slate-800" />
          <div className="hidden sm:block absolute top-10 left-10 w-16 sm:w-32 h-16 sm:h-32 border border-slate-700 rotate-45 opacity-30" />
          <div className="hidden sm:block absolute bottom-20 right-20 w-12 sm:w-24 h-12 sm:h-24 border border-slate-600 rotate-12 opacity-40" />
          <div className="hidden lg:block absolute top-1/2 left-1/4 w-16 h-16 border border-slate-700 -rotate-12 opacity-20" />
        </div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23475569' fill-opacity='0.05'%3E%3Cpath d='M0 0h60v60H0z'/%3E%3Cpath d='M0 0h30v30H0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            <AnimatedSection>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <Badge className="mb-4 sm:mb-6 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 text-white border-white/20 backdrop-blur-sm text-sm sm:text-base">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Trusted by 300+ Companies
              </Badge>
              </motion.div>
              
              <motion.h2 
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white px-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true }}
              >
                Why leading companies choose <span className="text-cyan-400">OVOKY</span>
              </motion.h2>
              
              <motion.p 
                className="text-base sm:text-lg lg:text-xl text-slate-300 mb-6 sm:mb-8 leading-relaxed px-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
              >
                 Join thousands of businesses who rely on our telecom infrastructure for 
                 mission-critical communications. From startups to enterprises, we deliver reliable connectivity.
              </motion.p>
              
              <motion.div 
                className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 px-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
              >
                {benefits.map((benefit, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-start space-x-3 group cursor-pointer"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex-shrink-0 w-5 h-5 mt-0.5 bg-cyan-400/20 rounded-full flex items-center justify-center border border-cyan-400/40 group-hover:bg-cyan-400/30 group-hover:border-cyan-400/60 transition-all duration-200">
                      <CheckCircle className="h-3 w-3 text-cyan-400" />
                    </div>
                    <span className="text-sm sm:text-base text-slate-200 group-hover:text-white transition-colors duration-200 leading-relaxed">{benefit}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div 
                className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 px-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                viewport={{ once: true }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Button 
                    size="lg" 
                    onClick={() => router.push('/register')} 
                    className="w-full sm:w-auto bg-white dark:bg-white text-slate-900 dark:text-black hover:bg-slate-100 dark:hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold"
                  >
                    <Rocket className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                   Get Started Today
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                 </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => handleNavClick('#contact')}
                    className="w-full sm:w-auto border-white/30 text-white bg-transparent hover:bg-white/20 hover:border-white/70 transition-all duration-300 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg"
                  >
                    <Headphones className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Talk to Expert
                </Button>
                </motion.div>
              </motion.div>
            </AnimatedSection>

            <AnimatedContent
              distance={80}
              direction="horizontal"
              duration={0.8}
              ease="power2.out"
              delay={0.2}
              threshold={0.2}
            >
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="group cursor-pointer"
                >
                  <div className="flex items-start p-4 sm:p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3 sm:mr-4 group-hover:bg-blue-500/30 transition-colors duration-300">
                      <PhoneCall className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
               </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 group-hover:text-blue-200 transition-colors duration-300 text-sm sm:text-base">Outbound / Inbound Campaigns</h3>
                      <p className="text-xs sm:text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">Automated voice campaigns with intelligent routing and real-time monitoring</p>
               </div>
                  </div>
                </motion.div>
                
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="group cursor-pointer"
                >
                  <div className="flex items-start p-4 sm:p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg flex items-center justify-center mr-3 sm:mr-4 group-hover:bg-green-500/30 transition-colors duration-300">
                      <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 group-hover:text-green-200 transition-colors duration-300 text-sm sm:text-base">AI Conversational Agents</h3>
                      <p className="text-xs sm:text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">Intelligent AI agents for automated customer interactions and support</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="group cursor-pointer"
                >
                  <div className="flex items-start p-4 sm:p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3 sm:mr-4 group-hover:bg-purple-500/30 transition-colors duration-300">
                      <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 group-hover:text-purple-200 transition-colors duration-300 text-sm sm:text-base">DID Numbers</h3>
                      <p className="text-xs sm:text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">Local and toll-free numbers in 220+ countries with instant setup</p>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="group cursor-pointer"
                >
                  <div className="flex items-start p-4 sm:p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3 sm:mr-4 group-hover:bg-orange-500/30 transition-colors duration-300">
                      <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 group-hover:text-orange-200 transition-colors duration-300 text-sm sm:text-base">Email & SMS Bulk Campaigns</h3>
                      <p className="text-xs sm:text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">Mass communication campaigns with advanced targeting and analytics</p>
                    </div>
                  </div>
                </motion.div>
             </div>
            </AnimatedContent>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
        {/* Enhanced background decorative elements - hidden on mobile for performance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-purple-500/25 to-pink-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
          <div className="absolute top-10 right-1/4 w-48 h-48 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '6s' }}></div>
          <div className="absolute bottom-10 left-1/4 w-56 h-56 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '8s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimatedContent
            distance={80}
            direction="vertical"
            duration={0.6}
            ease="power2.out"
            delay={0}
            threshold={0.2}
          >
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="outline" className="mb-4 sm:mb-6 px-4 sm:px-6 py-2 sm:py-3 text-white border-white/40 bg-white/10 backdrop-blur-md shadow-xl">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Pay only for what you use
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-white">
                Pricing
              </h2>
              <p className="text-lg sm:text-xl text-slate-200 max-w-3xl mx-auto leading-relaxed px-4">
                Interactive pricing calculator - Calculate your exact costs with our transparent, usage-based pricing. Select a service below to see rates.
              </p>
            </div>
          </AnimatedContent>

          <AnimatedContent
            distance={80}
            direction="vertical"
            duration={0.8}
            ease="power2.out"
            delay={0.2}
            threshold={0.2}
          >
            <Card className="max-w-6xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <CardContent className="p-0">
                <Tabs defaultValue="calls" className="w-full" onValueChange={setActiveTab}>
                  {/* Modern Glass Tab Header - Mobile Optimized with Sliding */}
                  <div>
                    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
                      {/* Mobile Sliding Tabs with Arrows */}
                      <div className="block sm:hidden relative">
                        <div className="flex items-center">
                          {/* Left Arrow */}
                          <button 
                            onClick={() => scrollTabs('left')}
                            className="flex-shrink-0 p-2 text-white/60 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-lg mr-2 active:scale-95"
                            aria-label="Scroll tabs left"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>

                          {/* Scrollable Tabs Container with Touch Support */}
                          <div 
                            id="mobile-tabs-container"
                            className="flex-1 overflow-x-auto scrollbar-hide touch-pan-x no-scale"
                            style={{ 
                              scrollbarWidth: 'none', 
                              msOverflowStyle: 'none',
                              transform: 'none',
                              WebkitTransform: 'none'
                            }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                          >
                            <div style={{ transform: 'none', WebkitTransform: 'none' }} className="no-scale">
                              <TabsList className="flex items-center bg-white/10 backdrop-blur-lg rounded-xl p-1 shadow-xl border border-white/20 h-auto min-w-max gap-1 no-scale">
                              <TabsTrigger 
                                value="calls" 
                                className="relative flex flex-col items-center gap-1 py-3 px-2 text-slate-300 font-medium text-xs data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:shadow-lg rounded-lg transition-colors duration-300 hover:text-white hover:bg-white/20 group w-16 flex-shrink-0 no-scale"
                              >
                                <Phone className="h-5 w-5 flex-shrink-0 no-scale" />
                                <span className="text-center leading-tight no-scale">Voice</span>
                              </TabsTrigger>
                              <TabsTrigger 
                                value="sms" 
                                className="relative flex flex-col items-center gap-1 py-3 px-2 text-slate-300 font-medium text-xs data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:shadow-lg rounded-lg transition-colors duration-300 hover:text-white hover:bg-white/20 group w-16 flex-shrink-0 no-scale"
                              >
                                <MessageSquare className="h-5 w-5 flex-shrink-0 no-scale" />
                                <span className="text-center leading-tight no-scale">SMS</span>
                              </TabsTrigger>
                              <TabsTrigger 
                                value="email" 
                                className="relative flex flex-col items-center gap-1 py-3 px-2 text-slate-300 font-medium text-xs data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:shadow-lg rounded-lg transition-colors duration-300 hover:text-white hover:bg-white/20 group w-16 flex-shrink-0 no-scale"
                              >
                                <Mail className="h-5 w-5 flex-shrink-0 no-scale" />
                                <span className="text-center leading-tight no-scale">Email</span>
                              </TabsTrigger>
                              <TabsTrigger 
                                value="ai" 
                                className="relative flex flex-col items-center gap-1 py-3 px-2 text-slate-300 font-medium text-xs data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:shadow-lg rounded-lg transition-colors duration-300 hover:text-white hover:bg-white/20 group w-16 flex-shrink-0 no-scale"
                              >
                                <Bot className="h-5 w-5 flex-shrink-0 no-scale" />
                                <span className="text-center leading-tight no-scale">AI</span>
                              </TabsTrigger>
                              <TabsTrigger 
                                value="whatsapp" 
                                className="relative flex flex-col items-center gap-1 py-3 px-2 text-slate-300 font-medium text-xs data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:shadow-lg rounded-lg transition-colors duration-300 hover:text-white hover:bg-white/20 group w-16 flex-shrink-0 no-scale"
                              >
                                <MessageCircle className="h-5 w-5 flex-shrink-0 no-scale" />
                                <span className="text-center leading-tight no-scale">WhatsApp</span>
                              </TabsTrigger>
                              <TabsTrigger 
                                value="did" 
                                className="relative flex flex-col items-center gap-1 py-3 px-2 text-slate-300 font-medium text-xs data-[state=active]:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:shadow-lg rounded-lg transition-colors duration-300 hover:text-white hover:bg-white/20 group w-16 flex-shrink-0 no-scale"
                              >
                                <Globe className="h-5 w-5 flex-shrink-0 no-scale" />
                                                                <span className="text-center leading-tight no-scale">DID</span>
                              </TabsTrigger>
                            </TabsList>
                   </div>
                 </div>

                          {/* Right Arrow */}
                          <button 
                            onClick={() => scrollTabs('right')}
                            className="flex-shrink-0 p-2 text-white/60 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-lg ml-2 active:scale-95"
                            aria-label="Scroll tabs right"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
              </div>
                   </div>

                      {/* Desktop Tabs with sliding background */}
                      <TabsList className="hidden sm:flex justify-center items-center bg-white/10 backdrop-blur-lg rounded-2xl p-1 shadow-xl border border-white/20 h-auto w-full relative">
                        {/* Sliding background indicator */}
                        <motion.div
                          className={`absolute top-1 bottom-1 rounded-xl shadow-lg pointer-events-none ${
                            activeTab === 'calls' ? 'bg-gradient-to-r from-blue-500 to-purple-600' :
                            activeTab === 'sms' ? 'bg-gradient-to-r from-purple-500 to-pink-600' :
                            activeTab === 'email' ? 'bg-gradient-to-r from-orange-500 to-red-600' :
                            activeTab === 'ai' ? 'bg-gradient-to-r from-cyan-500 to-blue-600' :
                            activeTab === 'whatsapp' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                            'bg-gradient-to-r from-indigo-500 to-purple-600'
                          }`}
                          initial={false}
                          animate={{
                            left: `${(100 / 6) * (['calls', 'sms', 'email', 'ai', 'whatsapp', 'did'].indexOf(activeTab || 'calls'))}%`,
                            width: `${100 / 6}%`
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                            duration: 0.3
                          }}
                        />
                        
                        <TabsTrigger 
                          value="calls" 
                          className="relative flex items-center justify-center gap-2 py-3 px-2 text-slate-300 font-medium text-sm data-[state=active]:text-white data-[state=active]:bg-transparent rounded-xl transition-colors duration-300 hover:text-white hover:bg-white/10 group flex-1 z-10"
                        >
                          <Phone className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
                          <span>Voice</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="sms" 
                          className="relative flex items-center justify-center gap-2 py-3 px-2 text-slate-300 font-medium text-sm data-[state=active]:text-white data-[state=active]:bg-transparent rounded-xl transition-colors duration-300 hover:text-white hover:bg-white/10 group flex-1 z-10"
                        >
                          <MessageSquare className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
                          <span>SMS</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="email" 
                          className="relative flex items-center justify-center gap-2 py-3 px-2 text-slate-300 font-medium text-sm data-[state=active]:text-white data-[state=active]:bg-transparent rounded-xl transition-colors duration-300 hover:text-white hover:bg-white/10 group flex-1 z-10"
                        >
                          <Mail className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
                          <span>Email</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="ai" 
                          className="relative flex items-center justify-center gap-2 py-3 px-2 text-slate-300 font-medium text-sm data-[state=active]:text-white data-[state=active]:bg-transparent rounded-xl transition-colors duration-300 hover:text-white hover:bg-white/10 group flex-1 z-10"
                        >
                          <Bot className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
                          <span>AI</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="whatsapp" 
                          className="relative flex items-center justify-center gap-2 py-3 px-2 text-slate-300 font-medium text-sm data-[state=active]:text-white data-[state=active]:bg-transparent rounded-xl transition-colors duration-300 hover:text-white hover:bg-white/10 group flex-1 z-10"
                        >
                          <MessageCircle className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
                          <span>WhatsApp</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="did" 
                          className="relative flex items-center justify-center gap-2 py-3 px-2 text-slate-300 font-medium text-sm data-[state=active]:text-white data-[state=active]:bg-transparent rounded-xl transition-colors duration-300 hover:text-white hover:bg-white/10 group flex-1 z-10"
                        >
                          <Globe className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
                          <span>DID</span>
                        </TabsTrigger>
                      </TabsList>
                 </div>
                   </div>

                  <div className="p-4 sm:p-8 lg:p-12">
                    {/* Voice Calls Tab */}
                    <TabsContent value="calls" className="space-y-6 sm:space-y-8 mt-0">
                      <div className="text-center mb-6 sm:mb-8">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Voice Call Rates</h3>
                        <p className="text-slate-200 text-sm sm:text-base">Crystal clear voice calls with global coverage</p>
                  </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-5xl mx-auto">
                        <div className="space-y-4 sm:space-y-6">
                          <div className="bg-white/20 backdrop-blur-md p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-white/30 shadow-lg">
                            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                              <div className="p-2 sm:p-3 bg-blue-500/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg">
                                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                              <h4 className="text-base sm:text-lg font-semibold text-white">Select Destination Country</h4>
          </div>
                            <Select>
                              <SelectTrigger className="h-12 sm:h-14 bg-white/30 dark:bg-slate-700/30 backdrop-blur-sm border-white/40 dark:border-slate-600/40 focus:border-blue-400/60 focus:ring-blue-400/20 text-sm sm:text-base text-slate-900 dark:text-white">
                                <SelectValue placeholder="Choose destination country" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-white/40 dark:border-slate-600/40 text-slate-900 dark:text-white">
                                <SelectItem value="us" className="hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700">🇺🇸 United States</SelectItem>
                                <SelectItem value="uk" className="hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700">🇬🇧 United Kingdom</SelectItem>
                                <SelectItem value="ca" className="hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700">🇨🇦 Canada</SelectItem>
                                <SelectItem value="fr" className="hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700">🇫🇷 France</SelectItem>
                                <SelectItem value="de" className="hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700">🇩🇪 Germany</SelectItem>
                                <SelectItem value="au" className="hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700">🇦🇺 Australia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-blue-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-2 sm:gap-4">
                              <div className="p-2 sm:p-3 bg-blue-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-blue-400/30">
                                <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" />
                              </div>
                              <div>
                                <span className="font-semibold text-white block text-sm sm:text-base">Mobile Rate</span>
                                <span className="text-xs sm:text-sm text-slate-300">Premium mobile networks</span>
                              </div>
                            </div>
                            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-300">$0.025/Min</span>
                          </div>
                          <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-green-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-2 sm:gap-4">
                              <div className="p-2 sm:p-3 bg-green-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-green-400/30">
                                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-green-300" />
                              </div>
                              <div>
                                <span className="font-semibold text-white block text-sm sm:text-base">Landline Rate</span>
                                <span className="text-xs sm:text-sm text-slate-300">Fixed line connections</span>
                              </div>
                            </div>
                            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-green-300">$0.015/Min</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* SMS Tab */}
                    <TabsContent value="sms" className="space-y-6 sm:space-y-8 mt-0">
                      <div className="text-center mb-6 sm:mb-8">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">SMS Messaging Rates</h3>
                        <p className="text-slate-200 text-sm sm:text-base">Reliable SMS delivery worldwide with detailed reporting</p>
                  </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-5xl mx-auto">
                        <div className="space-y-4 sm:space-y-6">
                          <div className="bg-white/20 backdrop-blur-md p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-white/30 shadow-lg">
                            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                              <div className="p-2 sm:p-3 bg-purple-500/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg">
                                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                              <h4 className="text-base sm:text-lg font-semibold text-white">Select Destination Country</h4>
          </div>
                            <Select>
                              <SelectTrigger className="h-12 sm:h-14 bg-white/30 dark:bg-slate-700/30 backdrop-blur-sm border-white/40 dark:border-slate-600/40 focus:border-purple-400/60 focus:ring-purple-400/20 text-sm sm:text-base text-slate-900 dark:text-white">
                                <SelectValue placeholder="Choose destination country" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-white/40 dark:border-slate-600/40 text-slate-900 dark:text-white">
                                <SelectItem value="us" className="hover:bg-purple-50 dark:hover:bg-slate-700 focus:bg-purple-50 dark:focus:bg-slate-700">🇺🇸 United States</SelectItem>
                                <SelectItem value="uk" className="hover:bg-purple-50 dark:hover:bg-slate-700 focus:bg-purple-50 dark:focus:bg-slate-700">🇬🇧 United Kingdom</SelectItem>
                                <SelectItem value="ca" className="hover:bg-purple-50 dark:hover:bg-slate-700 focus:bg-purple-50 dark:focus:bg-slate-700">🇨🇦 Canada</SelectItem>
                                <SelectItem value="fr" className="hover:bg-purple-50 dark:hover:bg-slate-700 focus:bg-purple-50 dark:focus:bg-slate-700">🇫🇷 France</SelectItem>
                                <SelectItem value="de" className="hover:bg-purple-50 dark:hover:bg-slate-700 focus:bg-purple-50 dark:focus:bg-slate-700">🇩🇪 Germany</SelectItem>
                                <SelectItem value="au" className="hover:bg-purple-50 dark:hover:bg-slate-700 focus:bg-purple-50 dark:focus:bg-slate-700">🇦🇺 Australia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-blue-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-2 sm:gap-4">
                              <div className="p-2 sm:p-3 bg-blue-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-blue-400/30">
                                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" />
                              </div>
                              <div>
                                <span className="font-semibold text-white block text-sm sm:text-base">Sending SMS</span>
                                <span className="text-xs sm:text-sm text-slate-300">Outbound messages</span>
                              </div>
                            </div>
                            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-300">$0.008/Msg</span>
                          </div>
                          <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-green-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-2 sm:gap-4">
                              <div className="p-2 sm:p-3 bg-green-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-green-400/30">
                                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-green-300 rotate-180" />
                              </div>
                              <div>
                                <span className="font-semibold text-white block text-sm sm:text-base">Receiving SMS</span>
                                <span className="text-xs sm:text-sm text-slate-300">Inbound messages</span>
                              </div>
                            </div>
                            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-green-300">$0.003/Msg</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Email Tab */}
                    <TabsContent value="email" className="space-y-6 sm:space-y-8 mt-0">
                      <div className="text-center mb-6 sm:mb-8">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Email Campaign Rates</h3>
                        <p className="text-slate-200 text-sm sm:text-base">Professional email delivery with advanced analytics</p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-5xl mx-auto">
                        <div className="space-y-4 sm:space-y-6">
                          <div className="bg-white/20 backdrop-blur-md p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-white/30 shadow-lg">
                            <h4 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">Email Configuration</h4>
                            <div className="space-y-4 sm:space-y-6">
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-white mb-2 sm:mb-3 block">Email Type</label>
                                <Select>
                                  <SelectTrigger className="h-12 sm:h-14 bg-white/30 dark:bg-slate-700/30 backdrop-blur-sm border-white/40 dark:border-slate-600/40 focus:border-orange-400/60 focus:ring-orange-400/20 text-sm sm:text-base text-slate-900 dark:text-white">
                                    <SelectValue placeholder="Select email type" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-white/40 dark:border-slate-600/40 text-slate-900 dark:text-white">
                                    <SelectItem value="marketing" className="hover:bg-orange-50 dark:hover:bg-slate-700 focus:bg-orange-50 dark:focus:bg-slate-700">📧 Marketing - $0.0012/email</SelectItem>
                                    <SelectItem value="otp" className="hover:bg-orange-50 dark:hover:bg-slate-700 focus:bg-orange-50 dark:focus:bg-slate-700">🔐 OTP/Verification - $0.0008/email</SelectItem>
                                    <SelectItem value="support" className="hover:bg-orange-50 dark:hover:bg-slate-700 focus:bg-orange-50 dark:focus:bg-slate-700">🎧 Support - $0.0010/email</SelectItem>
                                    <SelectItem value="transactional" className="hover:bg-orange-50 dark:hover:bg-slate-700 focus:bg-orange-50 dark:focus:bg-slate-700">📋 Transactional - $0.0015/email</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-white mb-2 sm:mb-3 block">Volume: 10,000 emails</label>
                                <Slider 
                                  defaultValue={[10000]} 
                                  max={1000000} 
                                  min={1000} 
                                  step={1000} 
                                  className="w-full py-3 sm:py-4"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-2">
                                  <span>1K</span>
                                  <span>500K</span>
                                  <span>1M</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4 sm:space-y-6">
                          <div className="p-4 sm:p-6 lg:p-8 bg-slate-900/80 backdrop-blur-md rounded-xl sm:rounded-2xl text-white border border-white/20 shadow-xl">
                            <div className="space-y-3 sm:space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 text-sm sm:text-base">Email Type:</span>
                                <span className="font-semibold text-sm sm:text-base">Marketing</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 text-sm sm:text-base">Volume:</span>
                                <span className="font-semibold text-sm sm:text-base">10,000 emails</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300 text-sm sm:text-base">Rate:</span>
                                <span className="font-semibold text-sm sm:text-base">$0.0012 per email</span>
                              </div>
                              <hr className="border-white/20" />
                              <div className="flex justify-between items-center text-lg sm:text-xl lg:text-2xl font-bold">
                                <span>Total Cost:</span>
                                <span className="text-blue-400">$12.00</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* AI Agents Tab */}
                    <TabsContent value="ai" className="space-y-6 sm:space-y-8 mt-0">
                      <div className="text-center mb-6 sm:mb-8">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">AI Agent Rates</h3>
                        <p className="text-slate-200 text-sm sm:text-base">Intelligent conversational AI with natural language processing</p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-5xl mx-auto">
                        <div className="space-y-4 sm:space-y-6">
                          <div className="bg-white/20 backdrop-blur-md p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-white/30 shadow-lg">
                            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                              <div className="p-2 sm:p-3 bg-cyan-500/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg">
                                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <h4 className="text-base sm:text-lg font-semibold text-white">Select Country</h4>
                            </div>
                            <Select>
                              <SelectTrigger className="h-12 sm:h-14 bg-white/30 dark:bg-slate-700/30 backdrop-blur-sm border-white/40 dark:border-slate-600/40 focus:border-cyan-400/60 focus:ring-cyan-400/20 text-sm sm:text-base text-slate-900 dark:text-white">
                                <SelectValue placeholder="Choose country" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-white/40 dark:border-slate-600/40 text-slate-900 dark:text-white">
                                <SelectItem value="us" className="hover:bg-cyan-50 dark:hover:bg-slate-700 focus:bg-cyan-50 dark:focus:bg-slate-700">🇺🇸 United States</SelectItem>
                                <SelectItem value="uk" className="hover:bg-cyan-50 dark:hover:bg-slate-700 focus:bg-cyan-50 dark:focus:bg-slate-700">🇬🇧 United Kingdom</SelectItem>
                                <SelectItem value="ca" className="hover:bg-cyan-50 dark:hover:bg-slate-700 focus:bg-cyan-50 dark:focus:bg-slate-700">🇨🇦 Canada</SelectItem>
                                <SelectItem value="fr" className="hover:bg-cyan-50 dark:hover:bg-slate-700 focus:bg-cyan-50 dark:focus:bg-slate-700">🇫🇷 France</SelectItem>
                                <SelectItem value="de" className="hover:bg-cyan-50 dark:hover:bg-slate-700 focus:bg-cyan-50 dark:focus:bg-slate-700">🇩🇪 Germany</SelectItem>
                                <SelectItem value="au" className="hover:bg-cyan-50 dark:hover:bg-slate-700 focus:bg-cyan-50 dark:focus:bg-slate-700">🇦🇺 Australia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-4 sm:space-y-6">
                          <div className="p-4 sm:p-6 lg:p-8 bg-slate-900/80 backdrop-blur-md rounded-xl sm:rounded-2xl text-white border border-white/20 shadow-xl">
                            <div className="flex justify-between items-center mb-4 sm:mb-6">
                              <div className="flex items-center gap-2 sm:gap-4">
                                <div className="p-2 sm:p-3 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl">
                                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                                </div>
                                <div>
                                  <span className="font-semibold text-lg sm:text-xl block">AI Agent</span>
                                  <span className="text-slate-300 text-xs sm:text-sm">per minute</span>
                                </div>
                              </div>
                              <span className="text-2xl sm:text-3xl font-bold text-blue-400">$0.045</span>
                            </div>
                            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-300 border-t border-white/20 pt-4 sm:pt-6">
                              <p className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
                                Natural language processing
                              </p>
                              <p className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
                                Voice synthesis & recognition
                              </p>
                              <p className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
                                Intelligent conversation flow
                              </p>
                              <p className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
                                Real-time analytics
                              </p>
            </div>
          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* WhatsApp Tab */}
                    <TabsContent value="whatsapp" className="space-y-6 sm:space-y-8 mt-0">
                      <div className="text-center mb-6 sm:mb-8">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">WhatsApp Business API</h3>
                        <p className="text-slate-200 text-sm sm:text-base">Official WhatsApp Business messaging with rich media support</p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-5xl mx-auto">
                        <div className="space-y-4 sm:space-y-6">
                          <div className="bg-white/20 backdrop-blur-md p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-white/30 shadow-lg">
                            <h4 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">Configuration</h4>
                            <div className="space-y-4 sm:space-y-6">
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-white mb-2 sm:mb-3 block">Country</label>
                                <Select>
                                  <SelectTrigger className="h-12 sm:h-14 bg-white/30 dark:bg-slate-700/30 backdrop-blur-sm border-white/40 dark:border-slate-600/40 focus:border-green-400/60 focus:ring-green-400/20 text-sm sm:text-base text-slate-900 dark:text-white">
                                    <SelectValue placeholder="Select country" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-white/40 dark:border-slate-600/40 text-slate-900 dark:text-white">
                                    <SelectItem value="us" className="hover:bg-green-50 dark:hover:bg-slate-700 focus:bg-green-50 dark:focus:bg-slate-700">🇺🇸 United States</SelectItem>
                                    <SelectItem value="uk" className="hover:bg-green-50 dark:hover:bg-slate-700 focus:bg-green-50 dark:focus:bg-slate-700">🇬🇧 United Kingdom</SelectItem>
                                    <SelectItem value="ca" className="hover:bg-green-50 dark:hover:bg-slate-700 focus:bg-green-50 dark:focus:bg-slate-700">🇨🇦 Canada</SelectItem>
                                    <SelectItem value="fr" className="hover:bg-green-50 dark:hover:bg-slate-700 focus:bg-green-50 dark:focus:bg-slate-700">🇫🇷 France</SelectItem>
                                    <SelectItem value="de" className="hover:bg-green-50 dark:hover:bg-slate-700 focus:bg-green-50 dark:focus:bg-slate-700">🇩🇪 Germany</SelectItem>
                                    <SelectItem value="au" className="hover:bg-green-50 dark:hover:bg-slate-700 focus:bg-green-50 dark:focus:bg-slate-700">🇦🇺 Australia</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-white mb-2 sm:mb-3 block">Message Type</label>
                                <Select>
                                  <SelectTrigger className="h-12 sm:h-14 bg-white/30 backdrop-blur-sm border-white/40 focus:border-green-400/60 focus:ring-green-400/20 text-sm sm:text-base text-slate-900">
                                    <SelectValue placeholder="Message type" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white/90 backdrop-blur-xl border-white/40">
                                    <SelectItem value="marketing">📢 Marketing - $0.055/msg</SelectItem>
                                    <SelectItem value="utility">⚡ Utility - $0.021/msg</SelectItem>
                                    <SelectItem value="auth">🔐 Authentication - $0.045/msg</SelectItem>
                                    <SelectItem value="support">🎧 Support - $0.032/msg</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-white mb-2 sm:mb-3 block">Volume: 5,000 messages</label>
                                <Slider defaultValue={[5000]} max={100000} min={100} step={100} className="w-full py-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                                                 <div className="space-y-4 sm:space-y-6">
                            <div className="space-y-3 sm:space-y-4">
                              <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-red-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center gap-2 sm:gap-4">
                                  <div className="p-2 sm:p-3 bg-red-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-red-400/30">
                                    <span className="text-red-300 text-sm sm:text-lg">📢</span>
                                  </div>
                                  <span className="font-semibold text-white text-sm sm:text-base">Marketing</span>
                                </div>
                                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-red-300">$0.055/Msg</span>
                              </div>
                              <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-yellow-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center gap-2 sm:gap-4">
                                  <div className="p-2 sm:p-3 bg-yellow-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-yellow-400/30">
                                    <span className="text-yellow-300 text-sm sm:text-lg">⚡</span>
                                  </div>
                                  <span className="font-semibold text-white text-sm sm:text-base">Utility</span>
                                </div>
                                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-300">$0.021/Msg</span>
                              </div>
                              <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-blue-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center gap-2 sm:gap-4">
                                  <div className="p-2 sm:p-3 bg-blue-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-blue-400/30">
                                    <span className="text-blue-300 text-sm sm:text-lg">🔐</span>
                                  </div>
                                  <span className="font-semibold text-white text-sm sm:text-base">Authentication</span>
                                </div>
                                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-300">$0.045/Msg</span>
                              </div>
                              <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-green-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center gap-2 sm:gap-4">
                                  <div className="p-2 sm:p-3 bg-green-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-green-400/30">
                                    <span className="text-green-300 text-sm sm:text-lg">🎧</span>
                                  </div>
                                  <span className="font-semibold text-white text-sm sm:text-base">Support</span>
                                </div>
                                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-green-300">$0.032/Msg</span>
                              </div>
                            </div>
                          </div>
                      </div>
                    </TabsContent>

                    {/* DID Numbers Tab */}
                    <TabsContent value="did" className="space-y-6 sm:space-y-8 mt-0">
                      <div className="text-center mb-6 sm:mb-8">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">DID Number Rates</h3>
                        <p className="text-slate-200 text-sm sm:text-base">Global phone numbers with instant activation and porting</p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-5xl mx-auto">
                        <div className="space-y-4 sm:space-y-6">
                          <div className="bg-white/20 backdrop-blur-md p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-white/30 shadow-lg">
                            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                              <div className="p-2 sm:p-3 bg-indigo-500/80 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg">
                                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <h4 className="text-base sm:text-lg font-semibold text-white">Select Country</h4>
                            </div>
                            <Select>
                              <SelectTrigger className="h-12 sm:h-14 bg-white/30 dark:bg-slate-700/30 backdrop-blur-sm border-white/40 dark:border-slate-600/40 focus:border-indigo-400/60 focus:ring-indigo-400/20 text-sm sm:text-base text-slate-900 dark:text-white">
                                <SelectValue placeholder="Choose country" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-white/40 dark:border-slate-600/40 text-slate-900 dark:text-white">
                                <SelectItem value="us" className="hover:bg-indigo-50 dark:hover:bg-slate-700 focus:bg-indigo-50 dark:focus:bg-slate-700">🇺🇸 United States</SelectItem>
                                <SelectItem value="uk" className="hover:bg-indigo-50 dark:hover:bg-slate-700 focus:bg-indigo-50 dark:focus:bg-slate-700">🇬🇧 United Kingdom</SelectItem>
                                <SelectItem value="ca" className="hover:bg-indigo-50 dark:hover:bg-slate-700 focus:bg-indigo-50 dark:focus:bg-slate-700">🇨🇦 Canada</SelectItem>
                                <SelectItem value="fr" className="hover:bg-indigo-50 dark:hover:bg-slate-700 focus:bg-indigo-50 dark:focus:bg-slate-700">🇫🇷 France</SelectItem>
                                <SelectItem value="de" className="hover:bg-indigo-50 dark:hover:bg-slate-700 focus:bg-indigo-50 dark:focus:bg-slate-700">🇩🇪 Germany</SelectItem>
                                <SelectItem value="au" className="hover:bg-indigo-50 dark:hover:bg-slate-700 focus:bg-indigo-50 dark:focus:bg-slate-700">🇦🇺 Australia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-blue-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-2 sm:gap-4">
                              <div className="p-2 sm:p-3 bg-blue-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-blue-400/30">
                                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" />
                              </div>
                              <div>
                                <span className="font-semibold text-white block text-sm sm:text-base">Local Numbers</span>
                                <span className="text-xs sm:text-sm text-slate-300">City-specific numbers</span>
                              </div>
                            </div>
                            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-300">$2.50/Mo</span>
                          </div>
                          <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-green-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-2 sm:gap-4">
                              <div className="p-2 sm:p-3 bg-green-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-green-400/30">
                                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-300" />
                              </div>
                              <div>
                                <span className="font-semibold text-white block text-sm sm:text-base">Toll-Free Numbers</span>
                                <span className="text-xs sm:text-sm text-slate-300">800, 888, 877 series</span>
                              </div>
                            </div>
                            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-green-300">$5.00/Mo</span>
                          </div>
                          <div className="flex justify-between items-center p-4 sm:p-6 bg-slate-800/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-600/40 hover:border-purple-400/60 hover:bg-slate-800/70 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center gap-2 sm:gap-4">
                              <div className="p-2 sm:p-3 bg-purple-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl border border-purple-400/30">
                                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-purple-300" />
                              </div>
                              <div>
                                <span className="font-semibold text-white block text-sm sm:text-base">Premium Numbers</span>
                                <span className="text-xs sm:text-sm text-slate-300">Vanity & special numbers</span>
                              </div>
                            </div>
                            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-300">$15.00/Mo</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </AnimatedContent>


        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-12 sm:py-16 lg:py-20 bg-primary dark:bg-slate-900 relative overflow-hidden">
        <AnimatedContent
          distance={80}
          direction="vertical"
          duration={0.8}
          ease="power2.out"
          delay={0}
          threshold={0.2}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
             Ready to connect your business
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>to the world?
           </h2>
            <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-2 sm:px-0">
             Join thousands of businesses using our reliable telecom infrastructure.
             Start free, scale globally with confidence.
           </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-4 px-4 sm:px-0">
            <Button 
              size="lg" 
              variant="secondary" 
              onClick={() => router.push('/register')} 
                className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg bg-white text-primary dark:text-slate-900 hover:bg-white/90 shadow-xl transition-all duration-300"
            >
              Start Building Free
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => handleNavClick('#contact')}
                className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg border-2 border-white text-white bg-transparent hover:bg-transparent hover:border-white/80 transition-all duration-300"
            >
                <Headphones className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Talk to Expert
            </Button>
          </div>
        </div>
        </AnimatedContent>
      </section>

      {/* Contact Expert Section */}
      <section id="contact" className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-40 h-40 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-60 h-60 bg-gradient-to-r from-purple-500/8 to-pink-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-gradient-to-r from-cyan-500/8 to-blue-500/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimatedContent
            distance={80}
            direction="vertical"
            duration={0.6}
            ease="power2.out"
            delay={0}
            threshold={0.2}
          >
            <div className="text-center mb-8 sm:mb-12">
              <Badge variant="outline" className="mb-4 sm:mb-6 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 backdrop-blur-sm shadow-lg">
                <Headphones className="h-4 w-4 mr-2" />
                Expert Consultation
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 dark:from-slate-100 dark:via-blue-100 dark:to-slate-100 bg-clip-text text-transparent">
                Talk to Our Experts
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Get personalized guidance from our telecom specialists. We'll help you choose the right solution for your business needs.
              </p>
            </div>
          </AnimatedContent>

          <AnimatedContent
            distance={80}
            direction="vertical"
            duration={0.8}
            ease="power2.out"
            delay={0.2}
            threshold={0.2}
          >
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl">
              <CardContent className="p-6 sm:p-8 lg:p-10">
                <form className="space-y-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                      Full Name *
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-border/60 bg-background/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <label htmlFor="companyName" className="text-sm font-medium text-foreground">
                      Company Name *
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-border/60 bg-background/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      placeholder="Enter your company name"
                    />
                  </div>

                  {/* Country and Phone Number Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="country" className="text-sm font-medium text-foreground">
                        Country *
                      </label>
                      <select
                        id="country"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-border/60 bg-background/50 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      >
                        <option value="">Select your country</option>
                        <option value="US">🇺🇸 United States</option>
                        <option value="GB">🇬🇧 United Kingdom</option>
                        <option value="CA">🇨🇦 Canada</option>
                        <option value="FR">🇫🇷 France</option>
                        <option value="DE">🇩🇪 Germany</option>
                        <option value="AU">🇦🇺 Australia</option>
                        <option value="JP">🇯🇵 Japan</option>
                        <option value="BR">🇧🇷 Brazil</option>
                        <option value="IN">🇮🇳 India</option>
                        <option value="SG">🇸🇬 Singapore</option>
                        <option value="NL">🇳🇱 Netherlands</option>
                        <option value="ES">🇪🇸 Spain</option>
                        <option value="IT">🇮🇹 Italy</option>
                        <option value="MX">🇲🇽 Mexico</option>
                        <option value="ZA">🇿🇦 South Africa</option>
                        <option value="AE">🇦🇪 United Arab Emirates</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="phoneNumber" className="text-sm font-medium text-foreground">
                        Phone Number *
                      </label>
                      <input
                        id="phoneNumber"
                        type="tel"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-border/60 bg-background/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  {/* Interested Products */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      Interested in Products * (Select all that apply)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center space-x-3 p-3 rounded-lg border border-border/40 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-pointer transition-all duration-200">
                        <input type="checkbox" name="products" value="voice" className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500 focus:ring-2" />
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Voice Solutions</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 p-3 rounded-lg border border-border/40 hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-900/20 cursor-pointer transition-all duration-200">
                        <input type="checkbox" name="products" value="sms" className="w-4 h-4 text-green-600 border-border rounded focus:ring-green-500 focus:ring-2" />
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">SMS Services</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 p-3 rounded-lg border border-border/40 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 cursor-pointer transition-all duration-200">
                        <input type="checkbox" name="products" value="did" className="w-4 h-4 text-purple-600 border-border rounded focus:ring-purple-500 focus:ring-2" />
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium">DID Numbers</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 p-3 rounded-lg border border-border/40 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 cursor-pointer transition-all duration-200">
                        <input type="checkbox" name="products" value="omnichannel" className="w-4 h-4 text-orange-600 border-border rounded focus:ring-orange-500 focus:ring-2" />
                        <div className="flex items-center space-x-2">
                          <Funnel className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">Omnichannel Platform</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 p-3 rounded-lg border border-border/40 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 cursor-pointer transition-all duration-200">
                        <input type="checkbox" name="products" value="whatsapp" className="w-4 h-4 text-indigo-600 border-border rounded focus:ring-indigo-500 focus:ring-2" />
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="h-4 w-4 text-indigo-500" />
                          <span className="text-sm font-medium">WhatsApp Business API</span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 p-3 rounded-lg border border-border/40 hover:border-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 cursor-pointer transition-all duration-200">
                        <input type="checkbox" name="products" value="ai" className="w-4 h-4 text-teal-600 border-border rounded focus:ring-teal-500 focus:ring-2" />
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4 text-teal-500" />
                          <span className="text-sm font-medium">AI Agents</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium text-foreground">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-border/60 bg-background/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-none"
                      placeholder="Tell us about your business needs and how we can help you..."
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button 
                      type="submit"
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black font-semibold py-4 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Headphones className="mr-2 h-5 w-5" />
                      Schedule Expert Consultation
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      We'll get back to you within 24 hours to schedule your consultation.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </AnimatedContent>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background/95 backdrop-blur-sm border-t border-border/40 py-8 sm:py-10">
        <AnimatedContent
          distance={80}
          direction="vertical"
          duration={0.8}
          ease="power2.out"
          delay={0}
          threshold={0.2}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-4 sm:mb-6">
              <div className="lg:col-span-1">
                <div className="flex items-center mb-3 sm:mb-4">
                  <BrandLogo className="h-7 sm:h-8 w-auto" />
              </div>
                <p className="text-muted-foreground mb-3 sm:mb-4 max-w-md text-sm leading-relaxed">
                  {companySlogan}. Enterprise-grade telecom infrastructure with developer-friendly APIs.
                </p>
                <div className="flex flex-row gap-4 sm:gap-5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3 flex-shrink-0" />
                  <span>Enterprise Security</span>
                </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>99.99% Uptime</span>
                </span>
              </div>
            </div>
            
              <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:col-span-2">
            <div>
                  <h3 className="font-semibold mb-3 text-foreground text-sm">Platform</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><button onClick={() => handleNavClick('#features')} className="hover:text-primary transition-colors text-left">Features</button></li>
                    <li><button onClick={() => handleNavClick('#solutions')} className="hover:text-primary transition-colors text-left">Solutions</button></li>
                    <li><button onClick={() => handleNavClick('#pricing')} className="hover:text-primary transition-colors text-left">Pricing</button></li>
                    <li><a href="/api-docs" className="hover:text-primary transition-colors">API Docs</a></li>
                    <li><a href="/status" className="hover:text-primary transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
                  <h3 className="font-semibold mb-3 text-foreground text-sm">Company</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="/about" className="hover:text-primary transition-colors">About</a></li>
                    <li><a href="/support" className="hover:text-primary transition-colors">Support</a></li>
                    <li><a href="/support/tickets" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="/login" className="hover:text-primary transition-colors">Sign In</a></li>
                <li><a href="/register" className="hover:text-primary transition-colors">Get Started</a></li>
              </ul>
                </div>
            </div>
          </div>
          
            <div className="border-t border-border/40 pt-4 sm:pt-5 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                © {new Date().getFullYear()} {companyName}. All rights reserved.
              </p>
              <div className="flex flex-row items-center gap-4 sm:gap-5 text-sm text-muted-foreground">
                <a href="/privacy" className="hover:text-primary transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-primary transition-colors">Terms</a>
              <a href="/compliance" className="hover:text-primary transition-colors">Compliance</a>
            </div>
          </div>
        </div>
        </AnimatedContent>
      </footer>
      
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "OVOKY",
            "url": "https://ovoky.io",
            "logo": "https://ovoky.io/favicon.ico",
            "description": "Enterprise-grade voice calls, SMS messaging, and DID numbers with global coverage, competitive rates, and carrier-grade reliability for businesses worldwide.",
            "foundingDate": "2024",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "url": "https://ovoky.io/support"
            },
            "sameAs": [
              "https://github.com/solusaas-git/ovoky-voip-platform"
            ],
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Communication Services",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Voice Calls",
                    "description": "Enterprise-grade voice calling services with global coverage"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "SMS Messaging",
                    "description": "Global SMS messaging services with competitive rates"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "DID Numbers",
                    "description": "Direct Inward Dialing numbers available worldwide"
                  }
                }
              ]
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "150",
              "bestRating": "5",
              "worstRating": "1"
            }
          })
        }}
      />
      
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
