import { 
  Home, 
  Users, 
  Settings, 
  LogOut,
  FileText,
  Activity
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useTranslations } from '@/lib/i18n';

export function ClientNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { t, isLoading: isTranslationsLoading } = useTranslations();

  const navigation = [
    { name: t('navigation.client.dashboard'), href: '/client', icon: Home },
    { name: t('navigation.client.accounts'), href: '/client/accounts', icon: Users },
    { name: t('navigation.client.activeCalls'), href: '/client/calls/active', icon: Activity },
    { name: t('navigation.client.cdrReports'), href: '/client/calls/cdrs', icon: FileText },
    { name: t('navigation.client.settings'), href: '/client/settings', icon: Settings },
  ];

  // Show loading while translations are loading
  if (isTranslationsLoading) {
    return (
      <nav className="flex flex-col h-full items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
        <p className="text-xs text-muted-foreground">Loading...</p>
      </nav>
    );
  }

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5',
                  isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <button
          onClick={() => logout()}
          className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
        >
          <LogOut
            className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
            aria-hidden="true"
          />
          {t('navigation.client.signOut')}
        </button>
      </div>
    </nav>
  );
} 