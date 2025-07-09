'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  headerActions?: ReactNode;
  className?: string;
}

export function PageLayout({ 
  children, 
  title, 
  description, 
  breadcrumbs, 
  headerActions,
  className = ''
}: PageLayoutProps) {
  return (
    <div className={`min-h-full ${className}`}>
      {/* Enhanced Page Header */}
      <div className="mb-6 md:mb-8">
        {/* Enhanced Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-3 md:mb-4">
            <nav className="flex items-center space-x-1 md:space-x-2 text-sm text-muted-foreground overflow-x-auto scrollbar-thin">
              <div className="flex items-center space-x-1 md:space-x-2 whitespace-nowrap">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.label} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight className="h-3 w-3 md:h-4 md:w-4 mx-1 md:mx-2 flex-shrink-0" />
                    )}
                    {crumb.href ? (
                      <Link 
                        href={crumb.href} 
                        className="hover:text-foreground transition-colors duration-200 px-1 py-1 rounded-md hover:bg-accent/50"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground px-1 py-1">
                        {crumb.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </nav>
          </div>
        )}
        
        {/* Enhanced Page Title & Actions */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-start md:justify-between md:space-y-0">
          <div className="space-y-2 md:space-y-1 flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
                {description}
              </p>
            )}
          </div>
          
          {headerActions && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="flex flex-wrap gap-2 md:flex-nowrap">
                {headerActions}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Page Content */}
      <div className="space-y-4 md:space-y-6">
        {children}
      </div>
    </div>
  );
} 