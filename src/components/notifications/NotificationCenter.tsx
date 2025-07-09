'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Filter, 
  CheckCheck, 
  Archive, 
  Trash2, 
  Bell,
  BellRing,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationType, NotificationPriority, NotificationStatus, NotificationTemplates, InternalNotification } from '@/types/notifications';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationItemProps {
  notification: InternalNotification;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onRead, onArchive, onDelete }: NotificationItemProps) {
  const template = NotificationTemplates[notification.type as NotificationType];
  const isUnread = notification.status === 'unread';

  const priorityColors = {
    low: 'bg-gray-100 dark:bg-gray-800 border-l-gray-400',
    medium: 'bg-blue-50 dark:bg-blue-950/20 border-l-blue-400',
    high: 'bg-orange-50 dark:bg-orange-950/20 border-l-orange-400',
    urgent: 'bg-red-50 dark:bg-red-950/20 border-l-red-400'
  };

  const handleClick = () => {
    if (isUnread) {
      onRead(notification.id);
    }
    
    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const timeAgo = (date: string | Date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diff = now.getTime() - notificationDate.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return notificationDate.toLocaleDateString();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'group relative p-4 border-l-4 cursor-pointer transition-all duration-200',
        priorityColors[notification.priority as NotificationPriority],
        isUnread ? 'bg-opacity-100' : 'bg-opacity-50',
        'hover:bg-opacity-80 hover:shadow-sm'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-lg" title={notification.type}>
          {notification.icon || template.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              'text-sm font-medium truncate',
              isUnread ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {notification.title}
            </h4>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {isUnread && (
                <div className="h-2 w-2 bg-primary rounded-full" />
              )}
              <span className="text-xs text-muted-foreground">
                {timeAgo(notification.createdAt)}
              </span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <Badge variant="outline" className="text-xs">
              {notification.priority}
            </Badge>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {isUnread && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRead(notification.id);
                  }}
                  title="Mark as read"
                >
                  <CheckCheck className="h-3 w-3" />
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(notification.id);
                }}
                title="Archive"
              >
                <Archive className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationCenter() {
  const {
    isNotificationCenterOpen,
    setNotificationCenterOpen,
    filteredNotifications,
    stats,
    isLoading,
    setFilter,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    refreshNotifications
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<NotificationType[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<NotificationPriority[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<NotificationStatus[]>([]);

  // Update filter when local filter state changes
  useEffect(() => {
    setFilter({
      search: searchQuery || undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      priorities: selectedPriorities.length > 0 ? selectedPriorities : undefined,
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined
    });
  }, [searchQuery, selectedTypes, selectedPriorities, selectedStatuses, setFilter]);

  const handleTypeToggle = (type: NotificationType) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handlePriorityToggle = (priority: NotificationPriority) => {
    setSelectedPriorities(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const handleStatusToggle = (status: NotificationStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    setSelectedPriorities([]);
    setSelectedStatuses([]);
  };

  const hasActiveFilters = searchQuery || selectedTypes.length > 0 || selectedPriorities.length > 0 || selectedStatuses.length > 0;

  const notificationTypes: NotificationType[] = [
    'ticket_created', 'ticket_updated', 'ticket_assigned', 'ticket_reply', 'ticket_resolved',
    'payment_success', 'payment_failed', 'low_balance', 'zero_balance',
    'phone_number_approved', 'phone_number_rejected', 'phone_number_purchased', 'phone_number_assigned',
    'system_maintenance', 'user_verification', 'admin_alert', 'rate_deck_updated',
    'call_quality_alert', 'security_alert'
  ];

  const priorities: NotificationPriority[] = ['low', 'medium', 'high', 'urgent'];
  const statuses: NotificationStatus[] = ['unread', 'read', 'archived'];

  return (
    <AnimatePresence>
      {isNotificationCenterOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            onClick={() => setNotificationCenterOpen(false)}
          />
          
          {/* Notification Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Notifications</h2>
                {stats.unread > 0 && (
                  <Badge variant="secondary">{stats.unread} unread</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={refreshNotifications}
                  disabled={isLoading}
                  className="h-8 w-8 p-0"
                  title="Refresh"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setNotificationCenterOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="p-4 space-y-3 border-b bg-muted/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Filter className="h-3 w-3" />
                      Filters
                      {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] text-xs">
                          {(selectedTypes.length + selectedPriorities.length + selectedStatuses.length + (searchQuery ? 1 : 0))}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Notification Types</DropdownMenuLabel>
                    {notificationTypes.map(type => (
                      <DropdownMenuCheckboxItem
                        key={type}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => handleTypeToggle(type)}
                      >
                        <span className="mr-2">{NotificationTemplates[type].icon}</span>
                        {type.replace(/_/g, ' ')}
                      </DropdownMenuCheckboxItem>
                    ))}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Priority</DropdownMenuLabel>
                    {priorities.map(priority => (
                      <DropdownMenuCheckboxItem
                        key={priority}
                        checked={selectedPriorities.includes(priority)}
                        onCheckedChange={() => handlePriorityToggle(priority)}
                      >
                        {priority}
                      </DropdownMenuCheckboxItem>
                    ))}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    {statuses.map(status => (
                      <DropdownMenuCheckboxItem
                        key={status}
                        checked={selectedStatuses.includes(status)}
                        onCheckedChange={() => handleStatusToggle(status)}
                      >
                        {status}
                      </DropdownMenuCheckboxItem>
                    ))}
                    
                    {hasActiveFilters && (
                      <>
                        <DropdownMenuSeparator />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="w-full justify-start"
                        >
                          Clear Filters
                        </Button>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {stats.unread > 0 && (
                  <Button
                    variant="outline" 
                    size="sm"
                    onClick={markAllAsRead}
                    className="gap-1"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {hasActiveFilters ? 'No notifications match your filters' : 'No notifications yet'}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={clearFilters}
                      className="mt-1"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-1">
                    <AnimatePresence>
                      {filteredNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onRead={markAsRead}
                          onArchive={archiveNotification}
                          onDelete={deleteNotification}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Footer Stats */}
            {filteredNotifications.length > 0 && (
              <div className="p-4 border-t bg-muted/10">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{filteredNotifications.length} notifications</span>
                  <span>{stats.unread} unread</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 