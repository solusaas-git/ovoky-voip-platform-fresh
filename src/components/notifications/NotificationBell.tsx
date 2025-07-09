'use client';

import React from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  animated?: boolean;
}

export function NotificationBell({ 
  className, 
  size = 'md', 
  showBadge = true, 
  animated = true 
}: NotificationBellProps) {
  const { 
    stats, 
    isNotificationCenterOpen, 
    setNotificationCenterOpen,
    isLoading 
  } = useNotifications();

  const hasUnread = stats.unread > 0;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9', 
    lg: 'h-10 w-10'
  };

  const badgeClasses = {
    sm: 'h-4 min-w-[16px] text-[10px]',
    md: 'h-5 min-w-[20px] text-xs',
    lg: 'h-6 min-w-[24px] text-sm'
  };

  const toggleNotificationCenter = () => {
    setNotificationCenterOpen(!isNotificationCenterOpen);
  };

  const bellVariants = {
    idle: { rotate: 0, scale: 1 },
    ring: { 
      rotate: [0, -10, 10, -5, 5, 0],
      scale: [1, 1.1, 1],
      transition: { 
        duration: 0.6,
        times: [0, 0.2, 0.4, 0.6, 0.8, 1]
      }
    }
  };

  const badgeVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring" as const,
        stiffness: 300,
        damping: 20
      }
    },
    pulse: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    }
  };

  const notificationCount = Math.min(stats.unread, 99); // Cap at 99

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleNotificationCenter}
        className={cn(
          buttonSizeClasses[size],
          'relative rounded-full hover:bg-muted/80 transition-colors',
          isNotificationCenterOpen && 'bg-muted',
          className
        )}
        disabled={isLoading}
      >
        <motion.div
          variants={bellVariants}
          animate={animated && hasUnread && !isNotificationCenterOpen ? "ring" : "idle"}
          className="relative"
        >
          {hasUnread && animated ? (
            <BellRing className={cn(sizeClasses[size], 'text-primary')} />
          ) : (
            <Bell className={cn(sizeClasses[size], hasUnread ? 'text-primary' : 'text-muted-foreground')} />
          )}
        </motion.div>

        {showBadge && hasUnread && (
          <AnimatePresence>
            <motion.div
              key="notification-badge"
              variants={badgeVariants}
              initial="hidden"
              animate={animated ? "pulse" : "visible"}
              exit="hidden"
              className="absolute -top-1 -right-1"
            >
              <Badge 
                variant="destructive" 
                className={cn(
                  badgeClasses[size],
                  'flex items-center justify-center font-bold rounded-full border-2 border-background',
                  'bg-red-500 text-white shadow-lg'
                )}
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </Badge>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Pulse effect for urgent notifications */}
        {animated && hasUnread && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ 
              scale: [1, 1.5],
              opacity: [0.6, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        )}
      </Button>

      {/* Tooltip-like indicator for very high priority notifications */}
      {hasUnread && stats.byPriority?.urgent > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 h-3 w-3 bg-red-600 rounded-full border-2 border-background"
          title="Urgent notifications"
        />
      )}
    </div>
  );
} 