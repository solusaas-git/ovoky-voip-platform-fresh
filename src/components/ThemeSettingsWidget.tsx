'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeSettingsWidget() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-2">
        <Select disabled>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Loading..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  const getThemeIcon = (themeValue: string) => {
    switch (themeValue) {
      case 'light':
        return <Sun className="h-3 w-3" />;
      case 'dark':
        return <Moon className="h-3 w-3" />;
      case 'system':
        return <Monitor className="h-3 w-3" />;
      default:
        return <Monitor className="h-3 w-3" />;
    }
  };



  return (
    <div className="space-y-2">
      <Select value={theme || 'system'} onValueChange={setTheme}>
        <SelectTrigger className="h-8 text-xs">
          <div className="flex items-center space-x-2">
            {getThemeIcon(theme || 'system')}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">
            <div className="flex items-center space-x-2">
              <Sun className="h-3 w-3" />
              <span>Light</span>
            </div>
          </SelectItem>
          <SelectItem value="dark">
            <div className="flex items-center space-x-2">
              <Moon className="h-3 w-3" />
              <span>Dark</span>
            </div>
          </SelectItem>
          <SelectItem value="system">
            <div className="flex items-center space-x-2">
              <Monitor className="h-3 w-3" />
              <span>System</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      
      {theme === 'system' && mounted && (
        <div className="text-xs text-muted-foreground flex items-center space-x-1">
          <Monitor className="h-3 w-3" />
          <span>
            Following system: {systemTheme === 'dark' ? '🌙 Dark' : '☀️ Light'} mode
          </span>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground">
        Theme preference applies globally across the application
      </div>
    </div>
  );
} 