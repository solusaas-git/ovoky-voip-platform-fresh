'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTickets } from '@/hooks/useTickets';
import { 
  TicketFilters, 
  SERVICE_LABELS, 
  PRIORITY_LABELS, 
  STATUS_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  TicketStatus
} from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Plus, 
  Filter, 
  RefreshCw, 
  MessageCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Activity,
  CheckCircle2,
  AlertCircle,
  CircleDot,
  Timer,
  Sparkles,
  Zap,
  AlertTriangle
} from 'lucide-react';

interface TicketListProps {
  showCreateButton?: boolean;
  onCreateTicket?: () => void;
}

export default function TicketList({ showCreateButton = true, onCreateTicket }: TicketListProps) {
  const { 
    tickets, 
    loading, 
    error, 
    pagination, 
    stats,
    fetchTickets, 
    clearError 
  } = useTickets();

  const [filters, setFilters] = useState<TicketFilters>({
    page: 1,
    limit: 10,
    search: '',
    status: undefined,
    service: undefined,
    priority: undefined,
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTickets(filters);
  }, [fetchTickets, filters]);

  const handleFilterChange = (key: keyof TicketFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filtering
    }));
  };

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      search: '',
      status: undefined,
      service: undefined,
      priority: undefined,
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <CircleDot className="h-4 w-4" />;
      case 'waiting_admin':
        return <Timer className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'closed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Enhanced User Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Total Tickets Card */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950/50 dark:via-slate-900/30 dark:to-slate-800/20 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent" />
            <div className="absolute inset-0 ring-1 ring-inset ring-slate-200/50 dark:ring-slate-700/50 rounded-lg" />
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-xl shadow-sm">
                  <BarChart3 className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                </div>
                <Sparkles className="h-4 w-4 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">{stats.total || 0}</p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Tickets</p>
                <p className="text-xs text-slate-500/70 dark:text-slate-400/70">All your requests</p>
              </div>
            </CardContent>
          </Card>

          {/* Open Tickets Card */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-red-50 via-red-50 to-red-100 dark:from-red-950/50 dark:via-red-900/30 dark:to-red-800/20 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
            <div className="absolute inset-0 ring-1 ring-inset ring-red-200/50 dark:ring-red-700/50 rounded-lg" />
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-xl shadow-sm">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <TrendingUp className="h-4 w-4 text-red-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.open || 0}</p>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Open</p>
                <p className="text-xs text-red-500/70 dark:text-red-400/70">Need attention</p>
              </div>
            </CardContent>
          </Card>

          {/* In Progress Card */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-blue-950/50 dark:via-blue-900/30 dark:to-blue-800/20 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
            <div className="absolute inset-0 ring-1 ring-inset ring-blue-200/50 dark:ring-blue-700/50 rounded-lg" />
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl shadow-sm">
                  <CircleDot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <Activity className="h-4 w-4 text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.in_progress || 0}</p>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">In Progress</p>
                <p className="text-xs text-blue-500/70 dark:text-blue-400/70">Being worked on</p>
              </div>
            </CardContent>
          </Card>

          {/* Waiting for Support Card */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 via-amber-50 to-amber-100 dark:from-amber-950/50 dark:via-amber-900/30 dark:to-amber-800/20 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
            <div className="absolute inset-0 ring-1 ring-inset ring-amber-200/50 dark:ring-amber-700/50 rounded-lg" />
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl shadow-sm">
                  <Timer className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <Clock className="h-4 w-4 text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{stats.waiting_admin || 0}</p>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Waiting Response</p>
                <p className="text-xs text-amber-500/70 dark:text-amber-400/70">Pending support</p>
              </div>
            </CardContent>
          </Card>

          {/* Resolved Card */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:via-emerald-900/30 dark:to-emerald-800/20 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            <div className="absolute inset-0 ring-1 ring-inset ring-emerald-200/50 dark:ring-emerald-700/50 rounded-lg" />
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <BarChart3 className="h-4 w-4 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{stats.resolved || 0}</p>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Resolved</p>
                <p className="text-xs text-emerald-500/70 dark:text-emerald-400/70">Successfully closed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Search and Filters */}
      <Card className="border-0 bg-card/80 backdrop-blur-md shadow-xl ring-1 ring-border/50 hover:shadow-2xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Enhanced Search */}
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Search tickets by title, description, or ticket number..."
                  value={filters.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-12 h-12 border-0 bg-background/60 backdrop-blur-sm hover:bg-background/80 focus:bg-background transition-all duration-200 text-base"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-12 px-6 border-0 bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-all duration-200"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Advanced Filters</span>
                  <span className="sm:hidden">Filters</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => fetchTickets(filters)}
                  disabled={loading}
                  className="h-12 px-6 border-0 bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-all duration-200"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>

            {/* Enhanced Expandable Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-muted/30 dark:bg-muted/20 rounded-xl border border-border/50">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger className="h-10 border-0 bg-background/60">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(value as TicketStatus)}
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Service</label>
                  <Select
                    value={filters.service || 'all'}
                    onValueChange={(value) => handleFilterChange('service', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger className="h-10 border-0 bg-background/60">
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Priority</label>
                  <Select
                    value={filters.priority || 'all'}
                    onValueChange={(value) => handleFilterChange('priority', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger className="h-10 border-0 bg-background/60">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="w-full h-10 border-0 bg-background/60 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Error Message */}
      {error && (
        <Alert variant="destructive" className="border-0 bg-destructive/5 dark:bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError} className="ml-4">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Modern Tickets List */}
      <div className="space-y-4">
        {loading && tickets.length === 0 ? (
          <Card className="border-0 bg-card/80 backdrop-blur-md shadow-xl ring-1 ring-border/50">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/30"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-primary absolute inset-0"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">Loading your tickets...</p>
                  <p className="text-sm text-muted-foreground">This won't take long</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : tickets.length === 0 ? (
          <Card className="border-0 bg-gradient-to-br from-card/80 to-muted/30 backdrop-blur-md shadow-xl ring-1 ring-border/50 hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center space-y-6">
                <div className="p-4 bg-primary/10 rounded-full shadow-lg ring-1 ring-primary/20">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">No tickets found</h3>
                  <p className="text-muted-foreground max-w-md">
                    {filters.search || filters.status || filters.service || filters.priority 
                      ? "Try adjusting your filters or search terms to find what you're looking for."
                      : "You haven't created any support tickets yet. Need help? Create your first ticket to get started."
                    }
                  </p>
                </div>
                {showCreateButton && !filters.search && !filters.status && !filters.service && !filters.priority && (
                  <Button onClick={onCreateTicket} size="lg" className="mt-4 shadow-lg hover:shadow-xl transition-shadow">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Ticket
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden shadow-xl ring-1 ring-border/50 bg-card/50 backdrop-blur-sm">
            <div className="overflow-x-auto">
              {/* Table Header */}
              <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-4 text-sm font-medium text-muted-foreground backdrop-blur-sm min-w-[1040px]">
                <div className="w-[80px] flex-shrink-0">Ticket #</div>
                <div className="w-[40px] flex-shrink-0 text-center">Priority</div>
                <div className="w-[280px] flex-shrink-0">Title & Description</div>
                <div className="w-[120px] flex-shrink-0">Service</div>
                <div className="w-[100px] flex-shrink-0">Priority</div>
                <div className="w-[140px] flex-shrink-0">Status</div>
                <div className="w-[80px] flex-shrink-0 text-center">Replies</div>
                <div className="w-[80px] flex-shrink-0">Created</div>
              </div>

              {/* Table Rows */}
              {tickets.map((ticket, index) => (
                <div key={ticket._id} className={`px-4 py-3 flex items-center gap-4 hover:bg-muted/40 hover:shadow-sm transition-all duration-200 group min-w-[1040px] ${index !== tickets.length - 1 ? 'border-b border-border/30' : ''}`}>
                  {/* Ticket Number */}
                  <div className="w-[80px] flex-shrink-0">
                    <Link href={`/support/tickets/${ticket._id}`} className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors">
                      #{ticket.ticketNumber}
                    </Link>
                  </div>

                  {/* Priority Indicator */}
                  <div className="w-[40px] flex-shrink-0 flex justify-center">
                    {ticket.priority === 'urgent' && <Zap className="h-4 w-4 text-red-500" />}
                    {ticket.status === 'open' && ticket.priority === 'high' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                  </div>

                  {/* Title & Description */}
                  <div className="w-[280px] flex-shrink-0">
                    <Link href={`/support/tickets/${ticket._id}`} className="block space-y-1 group-hover:text-primary transition-colors">
                      <div className="font-medium text-sm truncate" title={ticket.title}>
                        {ticket.title}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1" title={ticket.description}>
                        {ticket.description}
                      </div>
                    </Link>
                  </div>

                  {/* Service */}
                  <div className="w-[120px] flex-shrink-0">
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {SERVICE_LABELS[ticket.service]}
                    </Badge>
                  </div>

                  {/* Priority */}
                  <div className="w-[100px] flex-shrink-0">
                    <Badge className={`${PRIORITY_COLORS[ticket.priority]} text-xs whitespace-nowrap`}>
                      {PRIORITY_LABELS[ticket.priority]}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div className="w-[140px] flex-shrink-0">
                    <Badge className={`${STATUS_COLORS[ticket.status]} text-xs flex items-center justify-center gap-1 whitespace-nowrap`}>
                      {getStatusIcon(ticket.status)}
                      {STATUS_LABELS[ticket.status]}
                    </Badge>
                  </div>

                  {/* Replies */}
                  <div className="w-[80px] flex-shrink-0 text-center">
                    {ticket.replies.length > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <MessageCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">{ticket.replies.length}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
                  </div>

                  {/* Created Date */}
                  <div className="w-[80px] flex-shrink-0">
                    <div className="text-xs text-muted-foreground" title={formatDate(ticket.createdAt)}>
                      {getTimeAgo(ticket.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-card/80 backdrop-blur-md rounded-xl border-0 shadow-xl ring-1 ring-border/50 hover:shadow-2xl transition-all duration-300">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
            <span className="font-medium text-foreground">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
            <span className="font-medium text-foreground">{pagination.total}</span> results
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="border-0 bg-background/80 hover:bg-background shadow-md hover:shadow-lg transition-all duration-200"
            >
              Previous
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 bg-background/80 rounded-md border-0 shadow-md ring-1 ring-border/30">
              <span className="text-sm font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="border-0 bg-background/80 hover:bg-background shadow-md hover:shadow-lg transition-all duration-200"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 