// Phone Number Types
export type PhoneNumberStatus = 'available' | 'assigned' | 'reserved' | 'suspended' | 'cancelled';
export type PhoneNumberType = 'Geographic/Local' | 'Mobile' | 'National' | 'Toll-free' | 'Shared Cost' | 'NPV (Verified Numbers)' | 'Premium';
export type PhoneNumberCapability = 'voice' | 'sms' | 'fax';
export type BillingCycle = 'monthly' | 'yearly';
export type ConnectionType = 'ip_routing' | 'credentials';

// Phone Number Request Types
export type PhoneNumberRequestType = 'cancel' | 'transfer' | 'suspend' | 'modify';
export type PhoneNumberRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';

// Backorder specific types
export type BackorderRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'expired';

// Phone Number Billing Types
export type BillingStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type TransactionType = 'monthly_fee' | 'setup_fee' | 'prorated_fee' | 'refund';

// Phone Number interface
export interface PhoneNumber {
  _id: string;
  number: string;
  country: string;
  countryCode: string;
  numberType: PhoneNumberType;
  provider: string;
  status: PhoneNumberStatus;
  
  // Backorder configuration
  backorderOnly: boolean; // If true, users must place backorder requests instead of direct purchase
  
  // Rate deck assignment
  rateDeckId?: string;
  rateDeckName?: string;
  rateDeck?: {
    _id: string;
    name: string;
    description?: string;
    currency: string;
  };
  monthlyRate?: number;
  setupFee?: number;
  currency: string;
  
  // Assignment details
  assignedTo?: string;
  assignedToUser?: {
    _id: string;
    name?: string;
    email: string;
    company?: string;
    onboarding?: {
      companyName?: string;
    };
  };
  assignedBy?: string;
  assignedAt?: string;
  unassignedAt?: string;
  unassignedBy?: string;
  unassignedReason?: string;
  
  // Assignment history
  assignmentHistory?: PhoneNumberAssignment[];
  
  // Current assignment billing information (for assigned numbers only)
  currentBilling?: {
    monthlyRate: number;
    setupFee: number;
    currency: string;
  };
  
  // Billing details
  billingCycle: BillingCycle;
  nextBillingDate?: string;
  lastBilledDate?: string;
  billingDayOfMonth: number;
  
  // Additional metadata
  description?: string;
  capabilities: PhoneNumberCapability[];
  region?: string;
  timeZone?: string;
  
  // Technical connection parameters
  connectionType?: ConnectionType;
  // For IP routing
  ipAddress?: string;
  port?: number;
  // For credentials
  login?: string;
  password?: string;
  domain?: string; // Can be IP or domain name
  credentialsPort?: number;
  
  // Admin fields
  createdBy: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Phone Number Assignment interface
export interface PhoneNumberAssignment {
  _id: string;
  phoneNumberId: string;
  phoneNumber?: PhoneNumber;
  userId: string;
  user?: {
    _id: string;
    name?: string;
    email: string;
    company?: string;
    onboarding?: {
      companyName?: string;
    };
  };
  assignedBy: string;
  assignedAt: string;
  unassignedAt?: string;
  unassignedBy?: string;
  unassignedReason?: string;
  monthlyRate: number;
  setupFee: number;
  currency: string;
  billingStartDate: string;
  billingEndDate?: string;
  totalBilled?: number;
  status: 'active' | 'ended';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Phone Number Request interface
export interface PhoneNumberRequest {
  _id: string;
  requestNumber: string;
  phoneNumberId: string;
  phoneNumber?: PhoneNumber;
  userId: string;
  user?: {
    _id: string;
    name?: string;
    email: string;
    company?: string;
  };
  userEmail: string;
  requestType: PhoneNumberRequestType;
  status: PhoneNumberRequestStatus;
  reason: string;
  description?: string;
  
  // Admin actions
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  
  // Processing details
  processedBy?: string;
  processedAt?: string;
  processingNotes?: string;
  
  // Schedule details
  scheduledDate?: string;
  effectiveDate?: string;
  
  priority: RequestPriority;
  
  createdAt: string;
  updatedAt: string;
}

// Backorder Request interface
export interface BackorderRequest {
  _id: string;
  requestNumber: string; // Auto-generated unique request ID like "BO-20241220-001"
  phoneNumberId: string;
  phoneNumber?: PhoneNumber;
  userId: string;
  user?: {
    _id: string;
    name?: string;
    email: string;
    company?: string;
    onboarding?: {
      companyName?: string;
    };
  };
  userEmail: string;
  
  // Request details
  status: BackorderRequestStatus;
  priority: RequestPriority;
  reason?: string; // User's reason for requesting this number
  businessJustification?: string; // Additional business justification
  
  // Admin review
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  
  // Processing details
  processedBy?: string;
  processedAt?: string;
  processingNotes?: string;
  
  // Expiration
  expiresAt?: string; // Backorder requests can expire if not acted upon
  
  // Notification tracking
  lastNotificationSent?: string;
  notificationCount: number;
  
  createdAt: string;
  updatedAt: string;
}

// Phone Number Billing interface
export interface PhoneNumberBilling {
  _id: string;
  phoneNumberId: string;
  phoneNumber?: PhoneNumber;
  userId: string;
  user?: {
    _id: string;
    name?: string;
    email: string;
    company?: string;
  };
  assignmentId: string;
  assignment?: PhoneNumberAssignment;
  
  // Billing details
  billingPeriodStart: string;
  billingPeriodEnd: string;
  amount: number;
  currency: string;
  
  // Payment details
  status: BillingStatus;
  billingDate: string;
  paidDate?: string;
  failureReason?: string;
  
  // Transaction details
  transactionType: TransactionType;
  prorationDays?: number;
  
  // Integration with payments
  paymentId?: string;
  sippyTransactionId?: string;
  
  // Admin fields
  processedBy?: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface PhoneNumbersResponse {
  phoneNumbers: PhoneNumber[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PhoneNumberAssignmentsResponse {
  assignments: PhoneNumberAssignment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PhoneNumberRequestsResponse {
  requests: PhoneNumberRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PhoneNumberBillingResponse {
  billings: PhoneNumberBilling[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BackorderRequestsResponse {
  requests: BackorderRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form types
export interface CreatePhoneNumberForm {
  number: string;
  country: string;
  countryCode: string;
  numberType: PhoneNumberType;
  provider: string;
  backorderOnly?: boolean;
  // rateDeckId removed - rate decks are now assigned to users, not phone numbers
  monthlyRate?: number;
  setupFee?: number;
  currency: string;
  billingCycle: BillingCycle;
  billingDayOfMonth: number;
  description?: string;
  capabilities: PhoneNumberCapability[];
  region?: string;
  timeZone?: string;
  // Technical connection parameters
  connectionType?: ConnectionType;
  ipAddress?: string;
  port?: number;
  login?: string;
  password?: string;
  domain?: string;
  credentialsPort?: number;
  notes?: string;
}

export interface AssignPhoneNumberForm {
  userId: string;
  billingStartDate: string;
  notes?: string;
}

export interface CreatePhoneNumberRequestForm {
  phoneNumberId: string;
  requestType: PhoneNumberRequestType;
  reason: string;
  description?: string;
  scheduledDate?: string;
  priority?: RequestPriority;
}

export interface CreateBackorderRequestForm {
  phoneNumberId: string;
  reason?: string;
  businessJustification?: string;
  priority?: RequestPriority;
}

export interface UpdatePhoneNumberForm {
  provider?: string;
  status?: PhoneNumberStatus;
  backorderOnly?: boolean;
  // rateDeckId removed - rate decks are now assigned to users, not phone numbers
  monthlyRate?: number;
  setupFee?: number;
  billingCycle?: BillingCycle;
  billingDayOfMonth?: number;
  description?: string;
  capabilities?: PhoneNumberCapability[];
  region?: string;
  timeZone?: string;
  notes?: string;
}

// Filter types
export interface PhoneNumberFilters {
  status?: PhoneNumberStatus[];
  country?: string[];
  numberType?: PhoneNumberType[];
  assignedTo?: string;
  rateDeckId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PhoneNumberRequestFilters {
  status?: PhoneNumberRequestStatus[];
  requestType?: PhoneNumberRequestType[];
  userId?: string;
  priority?: RequestPriority[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PhoneNumberBillingFilters {
  status?: BillingStatus[];
  transactionType?: TransactionType[];
  userId?: string;
  phoneNumberId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BackorderRequestFilters {
  status?: BackorderRequestStatus[];
  userId?: string;
  priority?: RequestPriority[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Statistics types
export interface PhoneNumberStats {
  total: number;
  available: number;
  assigned: number;
  reserved: number;
  suspended: number;
  cancelled: number;
  byCountry: Record<string, number>;
  byType: Record<string, number>;
  totalMonthlyRevenue: number;
  averageMonthlyRate: number;
}

export interface PhoneNumberRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  cancelled: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface BackorderRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  cancelled: number;
  expired: number;
  byPriority: Record<string, number>;
}

// Status display labels
export const PHONE_NUMBER_STATUS_LABELS: Record<PhoneNumberStatus, string> = {
  available: 'Available',
  assigned: 'Assigned',
  reserved: 'Reserved',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
};

export const PHONE_NUMBER_TYPE_LABELS: Record<PhoneNumberType, string> = {
  'Geographic/Local': 'Geographic/Local',
  'Mobile': 'Mobile',
  'National': 'National',
  'Toll-free': 'Toll-free',
  'Shared Cost': 'Shared Cost',
  'NPV (Verified Numbers)': 'NPV (Verified Numbers)',
  'Premium': 'Premium',
};

export const REQUEST_STATUS_LABELS: Record<PhoneNumberRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const REQUEST_TYPE_LABELS: Record<PhoneNumberRequestType, string> = {
  cancel: 'Cancel',
  transfer: 'Transfer',
  suspend: 'Suspend',
  modify: 'Modify',
};

export const BACKORDER_STATUS_LABELS: Record<BackorderRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  monthly_fee: 'Monthly Fee',
  setup_fee: 'Setup Fee',
  prorated_fee: 'Prorated Fee',
  refund: 'Refund',
}; 