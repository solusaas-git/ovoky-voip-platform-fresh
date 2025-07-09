'use client';

import { useState, useCallback } from 'react';
import { 
  Ticket, 
  TicketFilters,
  TicketAttachment,
  TicketStats,
  TicketStatus,
  TicketPriority
} from '@/types/ticket';

interface AdminTicketFilters extends TicketFilters {
  assignedTo?: string;
  customerEmail?: string;
  userId?: string;
  dateRange?: string;
}

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  companyName?: string | null;
}

interface AdminTicketStats extends TicketStats {
  total: number;
  unassigned: number;
  urgent: number;
  overdue: number;
}

interface BulkUpdateRequest {
  ticketIds: string[];
  action: 'assign' | 'update_status' | 'update_priority' | 'delete';
  assignTo?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  internalNote?: string;
}

interface AssignmentRequest {
  assignTo: string;
  internalNote?: string;
}

interface StatusUpdateRequest {
  status: TicketStatus;
  internalNote?: string;
}

interface PriorityUpdateRequest {
  priority: TicketPriority;
  internalNote?: string;
}

interface AddReplyRequest {
  content: string;
  attachments?: TicketAttachment[];
  isInternal?: boolean;
}



export function useAdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<AdminTicketStats | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchTickets = useCallback(async (filters: AdminTicketFilters) => {
    try {
      setLoading(true);
      clearError();

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/tickets?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tickets');
      }

      setTickets(data.tickets);
      setPagination(data.pagination);
      setStats(data.stats);
      
      // Fetch admins if not already loaded
      if (!admins) {
        await fetchAdmins();
      }

      // Fetch users if not already loaded
      if (!users) {
        await fetchUsers();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [admins, users, clearError]);

  const fetchTicket = useCallback(async (ticketId: string) => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch(`/api/admin/tickets/${ticketId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch ticket');
      }

      const ticketData = await response.json();
      
      // The admin API returns ticket data directly, not wrapped in { ticket: ... }
      setTicket(ticketData);
      
      // Fetch admins if not already loaded
      if (!admins) {
        await fetchAdmins();
      }
    } catch (err: unknown) {
      console.error('Admin fetchTicket: Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [admins, clearError]);

  const fetchAdmins = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users?role=admin&limit=100');
      const data = await response.json();

      if (response.ok) {
        setAdmins(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users?limit=100');
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  const addInternalNote = useCallback(async (ticketId: string, content: string) => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_reply',
          content,
          isInternal: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add internal note');
      }

      // Update current ticket if viewing details
      if (ticket && ticket._id === ticketId) {
        await fetchTicket(ticketId); // Refetch to get latest data
      }

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add internal note');
      return false;
    } finally {
      setLoading(false);
    }
  }, [ticket, fetchTicket]);

  const assignTicket = useCallback(async (ticketId: string, request: AssignmentRequest) => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_ticket',
          assignedTo: request.assignTo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign ticket');
      }

      // Add internal note if provided
      if (request.internalNote && request.internalNote.trim()) {
        await addInternalNote(ticketId, request.internalNote);
      }

      // Update current ticket if viewing details
      if (ticket && ticket._id === ticketId) {
        await fetchTicket(ticketId); // Refetch to get latest data
      }

      // Update in tickets list
      setTickets(prev => prev.map(t => 
        t._id === ticketId ? { ...t, ...data.ticket } : t
      ));

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign ticket');
      return false;
    } finally {
      setLoading(false);
    }
  }, [ticket, addInternalNote, fetchTicket]);

  const updateTicketStatus = useCallback(async (ticketId: string, request: StatusUpdateRequest) => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          status: request.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ticket status');
      }

      // Add internal note if provided
      if (request.internalNote && request.internalNote.trim()) {
        await addInternalNote(ticketId, request.internalNote);
      }

      // Update current ticket if viewing details
      if (ticket && ticket._id === ticketId) {
        await fetchTicket(ticketId); // Refetch to get latest data
      }

      // Update in tickets list
      setTickets(prev => prev.map(t => 
        t._id === ticketId ? { ...t, ...data.ticket } : t
      ));

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket status');
      return false;
    } finally {
      setLoading(false);
    }
  }, [ticket, addInternalNote, fetchTicket]);

  const updateTicketPriority = useCallback(async (ticketId: string, request: PriorityUpdateRequest) => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_priority',
          priority: request.priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ticket priority');
      }

      // Add internal note if provided
      if (request.internalNote && request.internalNote.trim()) {
        await addInternalNote(ticketId, request.internalNote);
      }

      // Update current ticket if viewing details
      if (ticket && ticket._id === ticketId) {
        await fetchTicket(ticketId);
      }

      // Update in tickets list
      setTickets(prev => prev.map(t => 
        t._id === ticketId ? { ...t, ...data.ticket } : t
      ));

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket priority');
      return false;
    } finally {
      setLoading(false);
    }
  }, [ticket, addInternalNote, fetchTicket]);

  const bulkUpdateTickets = useCallback(async (request: BulkUpdateRequest) => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch('/api/admin/tickets/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tickets');
      }

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update tickets');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTicket = useCallback(async (ticketId: string) => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete ticket');
      }

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete ticket');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const addReply = useCallback(async (ticketId: string, request: AddReplyRequest) => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_reply',
          content: request.content,
          attachments: request.attachments || [],
          isInternal: request.isInternal || false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add reply');
      }

      // Update current ticket if viewing details
      if (ticket && ticket._id === ticketId) {
        await fetchTicket(ticketId);
      }

      // Update in tickets list
      setTickets(prev => prev.map(t => 
        t._id === ticketId ? { ...t, ...data.ticket } : t
      ));

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add reply');
      return false;
    } finally {
      setLoading(false);
    }
  }, [ticket, fetchTicket]);

  const uploadFiles = useCallback(async (files: FileList): Promise<TicketAttachment[]> => {
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/tickets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload files');
      }

      const data = await response.json();
      return data.files || [];
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    // State
    tickets,
    ticket,
    admins,
    users,
    loading,
    error,
    pagination,
    stats,

    // Actions
    fetchTickets,
    fetchTicket,
    assignTicket,
    updateTicketStatus,
    updateTicketPriority,
    addInternalNote,
    addReply,
    uploadFiles,
    bulkUpdateTickets,
    deleteTicket,
    clearError,
  };
}