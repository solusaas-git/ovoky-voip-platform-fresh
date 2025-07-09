'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  RefreshCw, 
  Ticket, 
  User,
  ExternalLink,
  MessageSquare,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Timer,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface UnsolvedTicket {
  id: string;
  ticketNumber: string;
  title: string;
  service: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    companyName?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  daysOpen: number;
  lastReplyAt?: Date;
  replyCount: number;
}

interface TicketStats {
  total: number;
  byStatus: {
    open: number;
    in_progress: number;
    waiting_user: number;
    waiting_admin: number;
  };
  byPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  oldestTicketDays: number;
  averageDaysOpen: number;
}

interface UnsolvedTicketsCardProps {
  onRefresh?: () => void;
  limit?: number;
  isEditMode?: boolean;
}

export function UnsolvedTicketsCard({ 
  onRefresh, 
  limit = 10,
  isEditMode = false
}: UnsolvedTicketsCardProps) {
  const { t } = useTranslations();
  const [tickets, setTickets] = useState<UnsolvedTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnsolvedTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/unsolved-tickets?limit=${limit}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch unsolved tickets');
      }
      
      const data = await response.json();
      setTickets(data.tickets || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching unsolved tickets:', error);
      setError(error instanceof Error ? error.message : 'Failed to load tickets');
      toast.error('Failed to load unsolved tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnsolvedTickets();
  }, [limit]);

  const handleRefresh = () => {
    fetchUnsolvedTickets();
    onRefresh?.();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'in_progress': return <Timer className="h-3 w-3 text-blue-500" />;
      case 'waiting_user': return <User className="h-3 w-3 text-orange-500" />;
      case 'waiting_admin': return <UserCheck className="h-3 w-3 text-purple-500" />;
      default: return <Ticket className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'open': return t('dashboard.widgets.unsolvedTickets.status.open');
      case 'in_progress': return t('dashboard.widgets.unsolvedTickets.status.inProgress');
      case 'waiting_user': return t('dashboard.widgets.unsolvedTickets.status.waitingUser');
      case 'waiting_admin': return t('dashboard.widgets.unsolvedTickets.status.waitingAdmin');
      default: return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getServiceDisplayName = (service: string) => {
    const serviceMap: { [key: string]: string } = {
      'outbound_calls': t('dashboard.widgets.unsolvedTickets.services.outboundCalls'),
      'inbound_calls': t('dashboard.widgets.unsolvedTickets.services.inboundCalls'),
      'did_numbers': t('dashboard.widgets.unsolvedTickets.services.didNumbers'),
      'sms': t('dashboard.widgets.unsolvedTickets.services.sms'),
      'emailing': t('dashboard.widgets.unsolvedTickets.services.emailing'),
      'whatsapp_business': t('dashboard.widgets.unsolvedTickets.services.whatsappBusiness'),
      'billing': t('dashboard.widgets.unsolvedTickets.services.billing'),
      'technical': t('dashboard.widgets.unsolvedTickets.services.technical'),
      'other': t('dashboard.widgets.unsolvedTickets.services.other')
    };
    return serviceMap[service] || service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPriorityDisplayName = (priority: string) => {
    switch (priority) {
      case 'urgent': return t('dashboard.widgets.unsolvedTickets.priority.urgent');
      case 'high': return t('dashboard.widgets.unsolvedTickets.priority.high');
      case 'medium': return t('dashboard.widgets.unsolvedTickets.priority.medium');
      case 'low': return t('dashboard.widgets.unsolvedTickets.priority.low');
      default: return priority.toUpperCase();
    }
  };

  const formatDaysAgo = (daysOpen: number) => {
    if (daysOpen === 0) return t('dashboard.widgets.unsolvedTickets.timeAgo.today');
    if (daysOpen === 1) return t('dashboard.widgets.unsolvedTickets.timeAgo.dayAgo');
    return t('dashboard.widgets.unsolvedTickets.timeAgo.daysAgo', { days: daysOpen.toString() });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            <div className="w-32 h-4 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-6 h-6 bg-muted rounded animate-pulse" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
            <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="w-48 h-4 bg-muted rounded animate-pulse" />
              <div className="w-32 h-3 bg-muted rounded animate-pulse" />
            </div>
            <div className="w-16 h-6 bg-muted rounded animate-pulse" />
          </div>
        ))}
        <div className="text-center text-sm text-muted-foreground">
          {t('dashboard.widgets.unsolvedTickets.loading')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          {t('dashboard.widgets.unsolvedTickets.error.title')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('dashboard.widgets.unsolvedTickets.error.tryAgain')}
        </Button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
            {t('dashboard.widgets.unsolvedTickets.emptyState.title')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('dashboard.widgets.unsolvedTickets.emptyState.description')}
          </p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('dashboard.widgets.unsolvedTickets.emptyState.refresh')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Ticket className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">
            {tickets.length === 1 
              ? t('dashboard.widgets.unsolvedTickets.header.ticketCount', { count: tickets.length.toString() })
              : t('dashboard.widgets.unsolvedTickets.header.ticketCountPlural', { count: tickets.length.toString() })
            }
          </span>
          {stats && stats.averageDaysOpen > 0 && (
            <Badge variant="outline" className="text-xs">
              {stats.averageDaysOpen === 1 
                ? t('dashboard.widgets.unsolvedTickets.header.averageDays', { days: stats.averageDaysOpen.toString() })
                : t('dashboard.widgets.unsolvedTickets.header.averageDaysPlural', { days: stats.averageDaysOpen.toString() })
              }
            </Badge>
          )}
        </div>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Stats */}
      {stats && isEditMode && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg border-2 border-dashed border-primary/20">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{stats.byPriority.urgent + stats.byPriority.high}</div>
            <div className="text-xs text-muted-foreground">
              {t('dashboard.widgets.unsolvedTickets.stats.highPriority')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{stats.oldestTicketDays}</div>
            <div className="text-xs text-muted-foreground">
              {t('dashboard.widgets.unsolvedTickets.stats.oldest')}
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {tickets.map((ticket, index) => (
          <div key={ticket.id}>
            <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-2">
              {/* Header Row: Ticket Info and Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded font-semibold">
                    {ticket.ticketNumber}
                  </code>
                  <div className="flex items-center space-x-1.5">
                    {getStatusIcon(ticket.status)}
                    <span className="text-sm font-medium">
                      {getStatusDisplayName(ticket.status)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={getPriorityBadgeVariant(ticket.priority)} 
                    className="text-xs font-semibold"
                  >
                    {getPriorityDisplayName(ticket.priority)}
                  </Badge>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDaysAgo(ticket.daysOpen)}</span>
                  </div>
                </div>
              </div>

              {/* Title and Service Details Row */}
              <div className="flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded">
                <div className="flex items-center space-x-3 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={ticket.title}>
                    {ticket.title}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {getServiceDisplayName(ticket.service)}
                  </Badge>
                  {ticket.replyCount > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>{ticket.replyCount}</span>
                    </div>
                  )}
                </div>
                <Link href={`/support/tickets/${ticket.id}`} passHref>
                  <Button variant="outline" size="sm" className="h-7 text-xs flex-shrink-0">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {t('dashboard.widgets.unsolvedTickets.ticketInfo.view')}
                  </Button>
                </Link>
              </div>

              {/* User and Assignment Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-orange-500 to-red-600 text-white">
                      {getInitials(ticket.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {ticket.user.name}
                    </p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      {ticket.user.email}
                    </p>
                    {ticket.user.companyName && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <Badge variant="secondary" className="text-xs">
                          {ticket.user.companyName}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  {ticket.assignedTo ? (
                    <Badge variant="secondary" className="text-xs">
                      <UserCheck className="w-3 h-3 mr-1" />
                      {ticket.assignedTo.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {t('dashboard.widgets.unsolvedTickets.ticketInfo.unassigned')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {index < tickets.length - 1 && <Separator className="my-2" />}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      {tickets.length > 0 && stats && (
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {stats.total === 1 
                ? t('dashboard.widgets.unsolvedTickets.footer.showing', { 
                    current: tickets.length.toString(), 
                    total: stats.total.toString() 
                  })
                : t('dashboard.widgets.unsolvedTickets.footer.showingPlural', { 
                    current: tickets.length.toString(), 
                    total: stats.total.toString() 
                  })
              }
            </span>
            <span>
              {t('dashboard.widgets.unsolvedTickets.footer.urgentHigh', { 
                urgent: stats.byPriority.urgent.toString(), 
                high: stats.byPriority.high.toString() 
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 