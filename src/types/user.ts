// User role enum - safe for client and server side imports
export enum UserRole {
  CLIENT = 'client',
  ADMIN = 'admin',
}

// Basic user interface for client-side use
export interface ClientUser {
  id: string;
  name: string;
  email: string;
  role: UserRole | 'super-admin';
  sippyAccountId?: number;
  isEmailVerified: boolean;
} 