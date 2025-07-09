'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { Home, Phone, FileText, LogOut, Menu, X, Users, Settings, ArrowLeftFromLine, User, Mail, DollarSign, CreditCard, LifeBuoy, Hash, MessageSquare, Network } from 'lucide-react';
import { toast } from 'sonner';
import { AccountVerificationModal } from '@/components/ui/account-verification-modal';
import { AccountSuspendedDialog } from '@/components/auth/AccountSuspendedDialog';
import { BrandLogo } from '@/components/ui/brand-logo';
import { UserOnboardingForm } from '@/components/onboarding/UserOnboardingForm';
import { useOnboarding } from '@/hooks/useOnboarding';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTranslations } from '@/lib/i18n';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const { needsOnboarding, needsVerification, isLoading: onboardingLoading, markOnboardingComplete, refetch } = useOnboarding();
  const { t, isLoading: isTranslationsLoading } = useTranslations();
  const sidebarNavRef = useRef<HTMLDivElement>(null);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setCollapsed(true);
  }, [pathname]);

  // Ensure scrollbar is visible immediately on mount
  useEffect(() => {
    if (sidebarNavRef.current) {
      // Force a reflow to ensure scrollbar styles are applied
      sidebarNavRef.current.style.overflowY = 'hidden';
      requestAnimationFrame(() => {
        if (sidebarNavRef.current) {
          sidebarNavRef.current.style.overflowY = 'auto';
        }
      });
    }
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setCollapsed(false);
      } else {
        setCollapsed(true);
      }
    };

    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const handleReturnToAdmin = async () => {
    try {
      const response = await fetch('/api/users/return-to-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('Returned to admin view');
        // Force a complete page reload to ensure admin context is properly loaded
        window.location.href = '/dashboard';
      } else {
        throw new Error('Failed to return to admin');
      }
    } catch (error) {
      console.error('Error returning to admin:', error);
      toast.error('Failed to return to admin view');
    }
  };

  const onOnboardingComplete = () => {
    markOnboardingComplete();
    toast.success('Onboarding completed successfully!');
  };

  const onOnboardingSkip = () => {
    markOnboardingComplete();
    toast.info('Onboarding skipped. You can complete it later in your account settings.');
  };

  const navSections = [
    {
      title: t('navigation.sections.main'),
      items: [
        { href: '/dashboard', label: t('navigation.items.dashboard.label'), icon: <Home className="h-5 w-5" />, description: t('navigation.items.dashboard.description') }
      ]
    },
    {
      title: t('navigation.sections.callManagement'),
      items: [
        { href: '/calls', label: t('navigation.items.activeCalls.label'), icon: <Phone className="h-5 w-5" />, description: t('navigation.items.activeCalls.description') },
        { href: '/cdrs', label: t('navigation.items.cdrReports.label'), icon: <FileText className="h-5 w-5" />, description: t('navigation.items.cdrReports.description') }
      ]
    },
    {
      title: t('navigation.sections.services'),
      items: [
        // Show different phone number links based on user role
        ...(user?.role === 'admin' 
          ? [
              { href: '/admin/phone-numbers', label: t('navigation.items.phoneNumbers.label'), icon: <Hash className="h-5 w-5" />, description: t('navigation.items.phoneNumbers.description') },
              { href: '/admin/phone-number-requests', label: t('navigation.items.numberRequests.label'), icon: <FileText className="h-5 w-5" />, description: t('navigation.items.numberRequests.description') },
              { href: '/admin/trunks', label: t('navigation.items.trunks.label'), icon: <Network className="h-5 w-5" />, description: t('navigation.items.trunks.description') },
              { href: '/admin/sms', label: t('navigation.items.smsManagement.label'), icon: <MessageSquare className="h-5 w-5" />, description: t('navigation.items.smsManagement.description') }
            ]
          : [
              { href: '/services/numbers', label: t('navigation.items.numbers.label'), icon: <Hash className="h-5 w-5" />, description: t('navigation.items.numbers.description') },
              { href: '/trunks', label: t('navigation.items.userTrunks.label'), icon: <Network className="h-5 w-5" />, description: t('navigation.items.userTrunks.description') },
              { href: '/sms', label: t('navigation.items.sms.label'), icon: <MessageSquare className="h-5 w-5" />, description: t('navigation.items.sms.description') }
            ]
        )
      ]
    },
    {
      title: t('navigation.sections.billing'),
      items: [
        { href: '/rates', label: t('navigation.items.rates.label'), icon: <DollarSign className="h-5 w-5" />, description: t('navigation.items.rates.description') },
        { href: '/payments', label: t('navigation.items.payments.label'), icon: <CreditCard className="h-5 w-5" />, description: t('navigation.items.payments.description') }
      ]
    },
    {
      title: t('navigation.sections.support'),
      items: [
        { href: '/support/tickets', label: t('navigation.items.supportTickets.label'), icon: <LifeBuoy className="h-5 w-5" />, description: t('navigation.items.supportTickets.description') }
      ]
    },
    {
      title: t('navigation.sections.account'),
      items: [
        { href: '/account', label: t('navigation.items.myAccount.label'), icon: <User className="h-5 w-5" />, description: t('navigation.items.myAccount.description') },
        // Only show admin items for admin role (excluding phone numbers which is now in Services)
        ...(user?.role === 'admin' ? [
          { href: '/users', label: t('navigation.items.users.label'), icon: <Users className="h-5 w-5" />, description: t('navigation.items.users.description') },
          { href: '/admin/customer-notifications', label: t('navigation.items.customerNotifications.label'), icon: <MessageSquare className="h-5 w-5" />, description: t('navigation.items.customerNotifications.description') },
          { href: '/admin/notifications', label: t('navigation.items.notificationLogs.label'), icon: <Mail className="h-5 w-5" />, description: t('navigation.items.notificationLogs.description') },
          { href: '/settings', label: t('navigation.items.settings.label'), icon: <Settings className="h-5 w-5" />, description: t('navigation.items.settings.description') }
        ] : [])
      ]
    }
  ];

  const isActive = (path: string) => pathname === path;

  // Show loading state while checking onboarding status - OPTIMIZED: Non-blocking
  // Instead of blocking the entire layout, we'll show the layout with a loading content area
  const showOnboardingLoader = onboardingLoading;

  // Show onboarding form if needed
  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <UserOnboardingForm 
          onComplete={onOnboardingComplete}
          onSkip={onOnboardingSkip}
        />
      </div>
    );
  }

  // Show loading while translations are loading
  if (isTranslationsLoading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is suspended (only for non-admin users)
  const isSuspended = user && user.isSuspended && user.role !== 'admin';
  
  const shouldBlockNavigation = needsVerification || isSuspended;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Enhanced Mobile Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-accent"
              onClick={toggleSidebar}
            >
              {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </Button>
            <BrandLogo 
              size="sm"
              textClassName="text-lg font-bold" 
            />
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher variant="dropdown" className="md:hidden" />
            <NotificationBell size="sm" />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Enhanced Sidebar */}
      <div
        className={`
          fixed top-0 bottom-0 left-0 z-40 w-72 sm:w-80 md:w-64 transform bg-card/95 md:bg-card shadow-xl md:shadow-lg 
          backdrop-blur-md md:backdrop-blur-none border-r border-border/50 transition-all duration-300 ease-out
          ${collapsed ? '-translate-x-full' : 'translate-x-0'} 
          md:sticky md:top-4 md:bottom-4 md:left-4 md:h-[calc(100vh-2rem)] md:translate-x-0 md:transform-none 
          md:ml-4 md:rounded-xl md:border md:border-border/50 md:max-h-[calc(100vh-2rem)]
        `}
      >
        <div className="flex h-full flex-col overflow-hidden md:rounded-xl bg-gradient-to-b from-card to-card/95">
          {/* Enhanced Header */}
          <div className="p-4 md:p-6 flex-shrink-0 border-b border-border/50">
            {/* Mobile: Show close button */}
            <div className="flex items-center justify-between md:justify-center">
              <BrandLogo 
                size="md"
                textClassName="text-xl font-bold" 
                className="md:mb-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8 rounded-lg"
                onClick={toggleSidebar}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center hidden md:block">{t('navigation.header.dashboard')}</p>
          </div>

          {/* Enhanced Navigation */}
          <div 
            ref={sidebarNavRef}
            className="flex-1 overflow-y-auto px-2 md:px-3 py-4 min-h-0 sidebar-scrollbar" 
            style={{ 
              WebkitOverflowScrolling: 'touch',
              maxHeight: 'calc(100vh - 240px)',
              scrollBehavior: 'smooth'
            }}
          >
            {navSections.map((section, sectionIndex) => (
              <div key={section.title} className={sectionIndex > 0 ? 'mt-6' : ''}>
                <div className="px-3 mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={shouldBlockNavigation ? '#' : item.href}
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          setCollapsed(true);
                        }
                      }}
                      className={`
                        group flex items-center px-3 py-3 md:py-2.5 rounded-xl md:rounded-lg text-sm font-medium 
                        transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                        ${shouldBlockNavigation 
                          ? 'opacity-50 pointer-events-none cursor-not-allowed' 
                          : ''
                        }
                        ${isActive(item.href)
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                          : 'text-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm'
                        }
                      `}
                    >
                      <div className={`
                        mr-3 p-2 md:p-1.5 rounded-lg md:rounded-md transition-all duration-200
                        ${isActive(item.href)
                          ? 'bg-primary-foreground/20 shadow-sm'
                          : 'bg-muted group-hover:bg-accent-foreground/10 group-hover:scale-110'
                        }
                      `}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm md:text-sm">{item.label}</div>
                      </div>
                      {isActive(item.href) && (
                        <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-primary-foreground rounded-full shadow-sm"></div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Enhanced User Profile & Actions */}
          <div className="flex-shrink-0 border-t border-border/50 p-3 md:p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 md:w-8 md:h-8 bg-gradient-to-br from-primary to-primary/80 rounded-xl md:rounded-lg flex items-center justify-center shadow-sm">
                <User className="h-5 w-5 md:h-4 md:w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role || 'Client'}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="hidden md:flex items-center space-x-2">
                  <NotificationBell size="sm" />
                  <ThemeToggle />
                </div>
                <LanguageSwitcher variant="dropdown" className="md:flex" />
              </div>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={logout}
                className="w-full h-10 md:h-9 rounded-xl md:rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="text-sm md:text-xs font-medium">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Overlay for mobile */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-all duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Enhanced Main content */}
      <div className="flex-1 min-w-0 md:mr-4">
        {/* Mobile top spacing */}
        <div className="h-16 md:h-0"></div>
        
        {/* Impersonation banner */}
        {user?.isImpersonating && (
          <div className="px-4 md:px-6 lg:px-8 xl:px-10 py-4 flex justify-center">
            <div className="max-w-7xl w-full bg-gradient-to-r from-amber-50 via-amber-100 to-orange-50 dark:from-amber-950 dark:via-amber-900 dark:to-orange-950 border border-amber-200 dark:border-amber-700 rounded-xl shadow-lg">
              <div className="px-4 md:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 md:space-x-4">
                    {/* Warning Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                        <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500 text-white">
                          Impersonation Mode
                        </span>
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-sm text-amber-800 dark:text-amber-200 truncate">
                        Viewing as{' '}
                        <span className="font-semibold text-amber-900 dark:text-amber-100">
                          {user?.name || 'another user'}
                        </span>
                        {user?.email && (
                          <span className="text-amber-700 dark:text-amber-300 hidden sm:inline">
                            {' '}({user.email})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleReturnToAdmin}
                      className="bg-white/80 hover:bg-white dark:bg-amber-800/50 dark:hover:bg-amber-700 border-amber-300 dark:border-amber-600 text-amber-800 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100 shadow-sm"
                    >
                      <ArrowLeftFromLine className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Return to Admin</span>
                      <span className="sm:hidden">Return</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Account Verification Modal - Only after onboarding is complete */}
        <AccountVerificationModal 
          userName={user?.name || 'User'} 
          userEmail={user?.email || ''}
          isOpen={needsVerification || false}
        />
        
        {/* Account Suspended Dialog - Show when user is suspended */}
        {isSuspended && (
          <AccountSuspendedDialog />
        )}
        
        <div className="h-full bg-gradient-to-br from-background via-background to-muted/20">
          <div className="p-4 md:p-6 lg:p-8 xl:p-10 max-w-7xl mx-auto">
            <div className="min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-6rem)]">
              {/* Show loading state while onboarding check is in progress */}
              {showOnboardingLoader ? (
                <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Initializing...</p>
                  </div>
                </div>
              ) : isSuspended ? (
                <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                  <div className="text-center space-y-4 opacity-30">
                    <div className="text-6xl">🚫</div>
                    <h2 className="text-2xl font-bold text-muted-foreground">Account Suspended</h2>
                    <p className="text-muted-foreground">Access has been temporarily restricted</p>
                  </div>
                </div>
              ) : !needsVerification ? (
                children
              ) : (
                <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                  <div className="text-center space-y-4 opacity-30">
                    <div className="text-6xl">🔒</div>
                    <h2 className="text-2xl font-bold text-muted-foreground">Access Restricted</h2>
                    <p className="text-muted-foreground">Account verification required</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Center */}
      <NotificationCenter />
    </div>
  );
} 