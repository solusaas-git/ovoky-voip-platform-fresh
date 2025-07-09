'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { SippyClient } from './sippyClient';
import { UserData } from './authService';

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  sippyClient: SippyClient | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string, 
    email: string, 
    password: string, 
    sippyAccountId: number
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sippyClient, setSippyClient] = useState<SippyClient | null>(null);
  const router = useRouter();

  // Check for user on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          
          // User suspension will be handled by MainLayout - just set the user data
          setUser(data.user);
          
          // Initialize SippyClient if credentials are available
          if (data.user && data.sippyCredentials) {
            const client = new SippyClient({
              username: data.sippyCredentials.username,
              password: data.sippyCredentials.password,
              host: data.sippyCredentials.host,
            });
            setSippyClient(client);
          }
        }
      } catch (error) {
        // Silently handle auth check errors
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If response is not JSON, create a generic error
          errorData = {
            error: 'Login failed',
            message: `HTTP ${response.status}: ${response.statusText}`,
            code: 'REQUEST_FAILED'
          };
        }
        
        // Throw structured error with status and code
        const structuredError = new Error(errorData.message || 'Login failed');
        Object.assign(structuredError, {
          ...errorData,
          status: response.status
        });
        
        throw structuredError;
      }

      const data = await response.json();
      
      // Set user data - suspension handling will be done by MainLayout
      setUser(data.user);
      
      // Initialize SippyClient
      if (data.user && data.sippyCredentials) {
        const client = new SippyClient({
          username: data.sippyCredentials.username,
          password: data.sippyCredentials.password,
          host: data.sippyCredentials.host,
        });
        setSippyClient(client);
      }
      
      toast.success('Logged in successfully');
      
      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error) {
      throw error; // Re-throw so LoginForm can handle it
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (
    name: string, 
    email: string, 
    password: string, 
    sippyAccountId: number
  ) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, sippyAccountId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      setUser(data.user);
      
      // Initialize SippyClient
      if (data.sippyCredentials) {
        const client = new SippyClient({
          username: data.sippyCredentials.username,
          password: data.sippyCredentials.password,
          host: data.sippyCredentials.host,
        });
        setSippyClient(client);
      }
      
      toast.success('Registered successfully');
      
      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      setUser(null);
      setSippyClient(null);
      router.push('/');
      toast.success('Logged out successfully');
    } catch (error) {
      // Silent error handling for logout
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        sippyClient,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 