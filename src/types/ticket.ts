export type TicketService = 
  | 'outbound_calls' 
  | 'inbound_calls' 
  | 'did_numbers' 
  | 'sms' 
  | 'emailing' 
  | 'whatsapp_business' 
  | 'billing' 
  | 'technical' 
  | 'other';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketStatus = 
  | 'open' 
  | 'in_progress' 
  | 'waiting_user' 
  | 'waiting_admin' 
  | 'resolved' 
  | 'closed';

export type AuthorType = 'user' | 'admin';

export interface TicketAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  url?: string;
}

// Additional ticket data for specific services
export interface OutboundCallData {
  examples: Array<{
    number: string;
    callDate: Date | string;
    description?: string;
  }>;
}

export interface AssignedNumber {
  number: string;
  description?: string;
  type?: string;
  country?: string;
  countryCode?: string;
  capabilities?: string[];
  monthlyRate?: number;
  setupFee?: number;
  currency?: string;
  assignedAt?: Date | string;
  billingStartDate?: Date | string;
  notes?: string;
}

export interface TicketReply {
  _id?: string;
  content: string;
  attachments?: TicketAttachment[];
  authorId: string;
  authorType: AuthorType;
  createdAt: Date;
  isInternal?: boolean;
  author?: {
    _id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
}

export interface Ticket {
  _id: string;
  id?: string; // Alias for _id for compatibility
  ticketNumber: string;
  title: string;
  description: string;
  service: TicketService;
  priority: TicketPriority;
  userId: string;
  userEmail: string;
  status: TicketStatus;
  assignedTo?: string | {
    _id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  attachments?: TicketAttachment[];
  replies: TicketReply[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  tags?: string[];
  internalNotes?: string;
  customerSatisfactionRating?: number;
  estimatedResolutionTime?: Date;
  
  // New service-specific fields
  country?: string; // For services that need country
  outboundCallData?: OutboundCallData; // For outbound calls
  assignedNumbers?: AssignedNumber[]; // For numbers/inbound services
  selectedPhoneNumbers?: string[]; // Phone numbers selected by user when creating ticket
  
  // Additional fields for UI
  user?: {
    _id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
      state?: string;
    };
  };
  userOnboarding?: {
    userId: string;
    companyName: string;
  };
  replyCount?: number;
  lastReplyAt?: Date;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  service: TicketService;
  priority: TicketPriority;
  attachments?: TicketAttachment[];
  country?: string;
  outboundCallData?: OutboundCallData;
  selectedPhoneNumbers?: string[];
}

export interface UpdateTicketRequest {
  action: 'add_reply' | 'close_ticket' | 'reopen_ticket' | 'rate_satisfaction' | 'update_status';
  content?: string;
  attachments?: TicketAttachment[];
  rating?: number;
  comment?: string;
  status?: TicketStatus;
}

export interface AdminUpdateTicketRequest {
  action: 
    | 'add_reply' 
    | 'update_status' 
    | 'assign_ticket' 
    | 'update_priority'
    | 'update_tags'
    | 'update_internal_notes'
    | 'set_estimated_resolution'
    | 'bulk_update';
  content?: string;
  attachments?: TicketAttachment[];
  status?: TicketStatus;
  assignedTo?: string;
  priority?: TicketPriority;
  tags?: string[];
  internalNotes?: string;
  estimatedResolutionTime?: string;
  isInternal?: boolean;
}

export interface TicketFilters {
  status?: TicketStatus;
  service?: TicketService;
  priority?: TicketPriority;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TicketStats {
  total: number;
  open?: number;
  in_progress?: number;
  waiting_user?: number;
  waiting_admin?: number;
  resolved?: number;
  closed?: number;
}

export interface TicketListResponse {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  stats?: TicketStats;
}

export interface UploadResponse {
  message: string;
  files: TicketAttachment[];
}

// Service display labels
export const SERVICE_LABELS: Record<TicketService, string> = {
  outbound_calls: 'Outbound Calls',
  inbound_calls: 'Inbound Calls',
  did_numbers: 'DID Numbers',
  sms: 'SMS',
  emailing: 'Emailing',
  whatsapp_business: 'WhatsApp Business',
  billing: 'Billing',
  technical: 'Technical',
  other: 'Other'
};

// Priority display labels and colors
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  medium: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  high: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200',
  urgent: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
};

// Status display labels and colors
export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_user: 'Waiting for User',
  waiting_admin: 'Waiting for Support',
  resolved: 'Resolved',
  closed: 'Closed'
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  waiting_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  waiting_user: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200',
};

// 48-hour restriction constants
export const ACTION_RESTRICTIONS = {
  REOPEN_HOURS: 48,
  RERATING_HOURS: 48,
} as const;

// Utility functions for time-based restrictions
export const canReopenTicket = (ticket: Ticket): { allowed: boolean; reason?: string } => {
  // Check if ticket is in a reopenable status
  if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
    return { allowed: false, reason: 'Only closed or resolved tickets can be reopened' };
  }

  // Get the reference date (resolvedAt for resolved tickets, closedAt for closed tickets)
  const referenceDate = ticket.status === 'resolved' 
    ? ticket.resolvedAt 
    : ticket.closedAt;

  if (!referenceDate) {
    // If no reference date, allow reopening (fallback for older tickets)
    return { allowed: true };
  }

  // Check if 48 hours have passed
  const now = new Date();
  const restrictionDate = new Date(referenceDate);
  restrictionDate.setHours(restrictionDate.getHours() + ACTION_RESTRICTIONS.REOPEN_HOURS);

  if (now > restrictionDate) {
    const hoursAgo = Math.floor((now.getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60));
    return { 
      allowed: false, 
      reason: `Tickets can only be reopened within 48 hours. This ticket was ${ticket.status} ${hoursAgo} hours ago.` 
    };
  }

  return { allowed: true };
};

export const canReRateTicket = (ticket: Ticket): { allowed: boolean; reason?: string } => {
  // Check if ticket has been resolved/closed
  if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
    return { allowed: false, reason: 'Tickets can only be re-rated after being resolved or closed' };
  }

  // Check if ticket has been rated already
  if (!ticket.customerSatisfactionRating) {
    return { allowed: false, reason: 'Ticket has not been rated yet' };
  }

  // Get the reference date (resolvedAt for resolved tickets, closedAt for closed tickets)
  const referenceDate = ticket.status === 'resolved' 
    ? ticket.resolvedAt 
    : ticket.closedAt;

  if (!referenceDate) {
    // If no reference date, allow re-rating (fallback for older tickets)
    return { allowed: true };
  }

  // Check if 48 hours have passed
  const now = new Date();
  const restrictionDate = new Date(referenceDate);
  restrictionDate.setHours(restrictionDate.getHours() + ACTION_RESTRICTIONS.RERATING_HOURS);

  if (now > restrictionDate) {
    const hoursAgo = Math.floor((now.getTime() - new Date(referenceDate).getTime()) / (1000 * 60 * 60));
    return { 
      allowed: false, 
      reason: `Tickets can only be re-rated within 48 hours. This ticket was ${ticket.status} ${hoursAgo} hours ago.` 
    };
  }

  return { allowed: true };
};

// Helper function to get time remaining for restrictions
export const getTimeRemaining = (referenceDate: Date | string, hours: number): string => {
  const now = new Date();
  const reference = new Date(referenceDate);
  const restrictionEnd = new Date(reference);
  restrictionEnd.setHours(restrictionEnd.getHours() + hours);

  if (now >= restrictionEnd) {
    return 'Expired';
  }

  const diffMs = restrictionEnd.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m remaining`;
  } else {
    return `${diffMinutes}m remaining`;
  }
}; 