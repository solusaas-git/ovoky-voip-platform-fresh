'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Info, Bell, ExternalLink } from 'lucide-react';
import { InternalNotification } from '@/types/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NotificationToastProps {
  notification: InternalNotification;
  onDismiss: () => void;
  onAction?: () => void;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

interface ToastPosition {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  transform?: string;
}

const getPositionStyles = (position: string): ToastPosition => {
  switch (position) {
    case 'top-left':
      return { top: '24px', left: '24px' };
    case 'top-right':
      return { top: '24px', right: '24px' };
    case 'top-center':
      return { top: '24px', left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-left':
      return { bottom: '24px', left: '24px' };
    case 'bottom-right':
      return { bottom: '24px', right: '24px' };
    case 'bottom-center':
      return { bottom: '24px', left: '50%', transform: 'translateX(-50%)' };
    default:
      return { top: '24px', right: '24px' };
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <AlertTriangle className="w-6 h-6 text-red-500" />;
    case 'high':
      return <AlertTriangle className="w-6 h-6 text-orange-500" />;
    case 'medium':
      return <Info className="w-6 h-6 text-blue-500" />;
    case 'low':
      return <Bell className="w-6 h-6 text-gray-500" />;
    default:
      return <Info className="w-6 h-6 text-blue-500" />;
  }
};

const getPriorityColors = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return {
        border: 'border-l-red-500',
        bg: 'bg-red-50 dark:bg-red-950/20',
        accent: 'text-red-700 dark:text-red-300'
      };
    case 'high':
      return {
        border: 'border-l-orange-500',
        bg: 'bg-orange-50 dark:bg-orange-950/20',
        accent: 'text-orange-700 dark:text-orange-300'
      };
    case 'medium':
      return {
        border: 'border-l-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        accent: 'text-blue-700 dark:text-blue-300'
      };
    case 'low':
      return {
        border: 'border-l-gray-500',
        bg: 'bg-gray-50 dark:bg-gray-950/20',
        accent: 'text-gray-700 dark:text-gray-300'
      };
    default:
      return {
        border: 'border-l-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        accent: 'text-blue-700 dark:text-blue-300'
      };
  }
};

export default function NotificationToast({ 
  notification, 
  onDismiss, 
  onAction,
  duration = 5000,
  position = 'top-right' 
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  const colors = getPriorityColors(notification.priority);
  const positionStyles = getPositionStyles(position);

  useEffect(() => {
    if (!isPaused && duration > 0) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - (100 / (duration / 100));
          if (newProgress <= 0) {
            handleDismiss();
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPaused, duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300); // Wait for animation
  };

  const handleAction = () => {
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
    if (onAction) {
      onAction();
    }
    handleDismiss();
  };

  const slideDirection = position.includes('left') ? -100 : position.includes('right') ? 100 : 0;
  const slideAxis = position.includes('left') || position.includes('right') ? 'x' : 'y';
  const initialSlide = slideAxis === 'x' ? slideDirection : position.includes('top') ? -100 : 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ 
            opacity: 0,
            scale: 0.8,
            [slideAxis]: initialSlide
          }}
          animate={{ 
            opacity: 1,
            scale: 1,
            [slideAxis]: 0
          }}
          exit={{ 
            opacity: 0,
            scale: 0.8,
            [slideAxis]: initialSlide
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.3
          }}
          className="fixed z-50 pointer-events-auto"
          style={positionStyles}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className={cn(
            "relative min-w-[400px] max-w-[500px] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700",
            "backdrop-blur-md bg-white/95 dark:bg-gray-900/95",
            "overflow-hidden",
            colors.bg,
            colors.border,
            "border-l-4"
          )}>
            {/* Progress bar */}
            {duration > 0 && (
              <div className="absolute top-0 left-0 h-1 bg-gray-200 dark:bg-gray-700 w-full">
                <motion.div
                  className={cn("h-full transition-all duration-100", colors.accent.replace('text-', 'bg-'))}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getPriorityIcon(notification.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        colors.bg,
                        colors.accent
                      )}>
                        {notification.priority.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {notification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Message */}
              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {notification.message}
                </p>
                
                {/* Additional data display */}
                {notification.data && Object.keys(notification.data).length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="space-y-1">
                      {Object.entries(notification.data).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(notification.createdAt).toLocaleTimeString()}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Dismiss
                  </button>
                  
                  {notification.actionUrl && (
                    <button
                      onClick={handleAction}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                        "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
                      )}
                    >
                      View Details
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-4 right-4 opacity-10">
              <div className={cn("w-20 h-20 rounded-full", colors.accent.replace('text-', 'bg-'))} />
            </div>
            <div className="absolute bottom-2 left-2 opacity-5">
              <div className={cn("w-12 h-12 rounded-full", colors.accent.replace('text-', 'bg-'))} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 