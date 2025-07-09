/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'xmlrpc' {
  export function createClient(options: {
    url: string;
    cookies?: boolean;
    headers?: Record<string, string>;
    basic_auth?: {
      user: string;
      pass: string;
    };
  }): {
    methodCall: (
      method: string, 
      params: any[], 
      callback: (error: Error | null, value: any) => void
    ) => void;
  };
  
  export function createSecureClient(options: {
    url: string;
    cookies?: boolean;
    headers?: Record<string, string>;
    basic_auth?: {
      user: string;
      pass: string;
    };
  }): {
    methodCall: (
      method: string, 
      params: any[], 
      callback: (error: Error | null, value: any) => void
    ) => void;
  };
} 