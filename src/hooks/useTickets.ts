import { useState, useCallback } from 'react';
import { 
  Ticket, 
  TicketFilters, 
  TicketListResponse, 
  CreateTicketRequest, 
  UpdateTicketRequest,
  UploadResponse,
  TicketAttachment
} from '@/types/ticket';

interface UseTicketsReturn {
  tickets: Ticket[];
  ticket: Ticket | null;
  loading: boolean;
  error: string | null;
  pagination: TicketListResponse['pagination'] | null;
  stats: TicketListResponse['stats'] | null;
  fetchTickets: (filters?: TicketFilters) => Promise<void>;
  fetchTicket: (id: string) => Promise<void>;
  createTicket: (data: CreateTicketRequest) => Promise<Ticket | null>;
  updateTicket: (id: string, data: UpdateTicketRequest) => Promise<boolean>;
  uploadFiles: (files: FileList) => Promise<TicketAttachment[]>;
  clearError: () => void;
  clearTicket: () => void;
}

export function useTickets(): UseTicketsReturn {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<TicketListResponse['pagination'] | null>(null);
  const [stats, setStats] = useState<TicketListResponse['stats'] | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearTicket = useCallback(() => {
    setTicket(null);
  }, []);

  const fetchTickets = useCallback(async (filters: TicketFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/tickets?${searchParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tickets');
      }

      const data: TicketListResponse = await response.json();
      setTickets(data.tickets);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTickets([]);
      setPagination(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTicket = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching ticket with ID:', id);
      const response = await fetch(`/api/tickets/${id}`);
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error response data:', errorData);
        throw new Error(errorData.error || 'Failed to fetch ticket');
      }

      const ticketData: Ticket = await response.json();
      console.log('Received ticket data:', ticketData);
      console.log('Setting ticket to state...');
      setTicket(ticketData);
      console.log('Ticket set successfully');
    } catch (err) {
      console.error('Error in fetchTicket:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTicket(null);
    } finally {
      setLoading(false);
      console.log('fetchTicket finished, loading set to false');
    }
  }, []);

  const createTicket = useCallback(async (data: CreateTicketRequest): Promise<Ticket | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      const result = await response.json();
      return result.ticket;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTicket = useCallback(async (id: string, data: UpdateTicketRequest): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Create an error object with the code if available
        const error = new Error(errorData.error || 'Failed to update ticket') as Error & { code?: string };
        if (errorData.code) {
          error.code = errorData.code;
        }
        throw error;
      }

      // Refresh the current ticket if it's the one being updated
      if (ticket?._id === id) {
        await fetchTicket(id);
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Re-throw the error with the code so components can handle specific cases
      const enhancedError = new Error(errorMessage) as Error & { code?: string };
      if (err instanceof Error && 'code' in err) {
        enhancedError.code = (err as Error & { code?: string }).code;
      }
      throw enhancedError;
    } finally {
      setLoading(false);
    }
  }, [ticket, fetchTicket]);

  const uploadFiles = useCallback(async (files: FileList): Promise<TicketAttachment[]> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/tickets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload files');
      }

      const result: UploadResponse = await response.json();
      return result.files;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tickets,
    ticket,
    loading,
    error,
    pagination,
    stats,
    fetchTickets,
    fetchTicket,
    createTicket,
    updateTicket,
    uploadFiles,
    clearError,
    clearTicket,
  };
}

// Admin version of the hook
export function useAdminTickets(): UseTicketsReturn & {
  assignTicket: (id: string, assignedTo: string) => Promise<boolean>;
  updateTicketStatus: (id: string, status: string) => Promise<boolean>;
} {
  const baseHook = useTickets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignTicket = useCallback(async (id: string, assignedTo: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'assign_ticket',
          assignedTo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign ticket');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTicketStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_status',
          status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update ticket status');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ...baseHook,
    loading: loading || baseHook.loading,
    error: error || baseHook.error,
    assignTicket,
    updateTicketStatus,
  };
} 