// Trunk Types (legacy status type kept for compatibility)
export type CodecType = 'G729' | 'G711a' | 'G711u' | 'G722' | 'iLBC' | 'GSM' | 'Speex';

// Trunk interface
export interface Trunk {
  _id: string;
  name: string;
  username: string;
  password: string;
  domain: string;
  ipAddress?: string; // Optional for backward compatibility
  ipAddresses: string[]; // Primary field for multiple IP addresses
  port?: number;

  
  // Codec configuration
  codecs: CodecType[];
  
  // Assignment details
  assignedTo: string; // User ID
  assignedToUser?: {
    _id: string;
    name?: string;
    email: string;
    company?: string;
    sippyAccountId?: number;
    onboarding?: {
      companyName?: string;
    };
  };
  assignedBy: string;
  assignedAt: string;
  
  // Optional additional configuration
  description?: string;
  registrationRequired?: boolean;
  authType?: 'password' | 'ip' | 'both';
  
  // Sippy integration fields (to be configured later)
  sippyAccountId?: string;
  sippyTrunkId?: string;
  sippyConfig?: Record<string, any>;
  
  // Admin fields
  createdBy: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Create Trunk Form interface
export interface CreateTrunkForm {
  name: string;
  username: string;
  password: string;
  domain: string;
  ipAddress?: string; // Optional for backward compatibility
  ipAddresses: string[]; // Required field for multiple IP addresses
  port?: number;
  assignedTo: string; // User ID
  codecs: CodecType[];
  description?: string;
  registrationRequired?: boolean;
  authType?: 'password' | 'ip' | 'both';
  notes?: string;
  maxSessions?: string; // Account capacity field - accepts numbers or "unlimited"
  maxCPS?: string; // Account capacity field - accepts numbers or "unlimited"
}

// Update Trunk Form interface
export interface UpdateTrunkForm {
  name?: string;
  username?: string;
  password?: string;
  domain?: string;
  ipAddress?: string; // Optional for backward compatibility
  ipAddresses?: string[]; // IP addresses array
  port?: number;
  assignedTo?: string; // User ID for reassignment
  codecs?: CodecType[];
  description?: string;
  registrationRequired?: boolean;
  authType?: 'password' | 'ip' | 'both';
  notes?: string;
}

// Trunk Assignment interface for history tracking
export interface TrunkAssignment {
  _id: string;
  trunkId: string;
  trunk?: Trunk;
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
  status: 'active' | 'ended';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Response interfaces
export interface TrunksResponse {
  trunks: Trunk[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TrunkAssignmentsResponse {
  assignments: TrunkAssignment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filters interface
export interface TrunkFilters {
  assignedTo?: string;
  codecs?: CodecType[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TrunkAssignmentFilters {
  userId?: string;
  trunkId?: string;
  status?: 'active' | 'ended';
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Statistics interface
export interface TrunkStats {
  total: number;
  assigned: number;
  unassigned: number;
  withSippyAccount: number;
  byCodec: Record<string, number>;
}

// Default codec selection
export const DEFAULT_CODECS: CodecType[] = ['G729', 'G711a', 'G711u'];

// Codec options for forms
export const CODEC_OPTIONS: { value: CodecType; label: string; description: string }[] = [
  { value: 'G729', label: 'G.729', description: 'Low bandwidth, good quality' },
  { value: 'G711a', label: 'G.711 A-law', description: 'Standard quality, higher bandwidth' },
  { value: 'G711u', label: 'G.711 μ-law', description: 'Standard quality, higher bandwidth' },
  { value: 'G722', label: 'G.722', description: 'Wideband, high quality' },
  { value: 'iLBC', label: 'iLBC', description: 'Internet Low Bitrate Codec' },
  { value: 'GSM', label: 'GSM', description: 'Good compression, mobile standard' },
  { value: 'Speex', label: 'Speex', description: 'Open source, variable bitrate' },
];

// Auth type options
export const AUTH_TYPE_OPTIONS = [
  { value: 'password', label: 'Password Only' },
  { value: 'ip', label: 'IP Only' },
  { value: 'both', label: 'Password + IP' },
] as const; 