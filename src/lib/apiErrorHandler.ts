import { toast } from 'sonner';

// Interfaces for type safety
interface UnknownError {
  message?: string;
  status?: number;
  code?: string;
  error?: string;
  [key: string]: unknown;
}

interface ResponseWithStatus {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  json(): Promise<unknown>;
  [key: string]: unknown;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  status?: number;
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  code?: string;
}

/**
 * Handle API errors with user-friendly messages
 */
export function handleApiError(error: UnknownError, customMessage?: string): void {
  console.error('API Error:', error);

  let errorMessage = customMessage || 'An unexpected error occurred';
  let errorTitle = 'Error';

  // Handle fetch errors or network issues
  if (error instanceof TypeError && error.message.includes('fetch')) {
    errorMessage = 'Network error. Please check your connection and try again.';
    errorTitle = 'Connection Error';
  }
  // Handle structured API error responses
  else if (error?.status || error?.code) {
    const apiError = error as ApiError;
    
    switch (apiError.status || apiError.code) {
      case 401:
      case 'AUTH_REQUIRED':
        errorMessage = apiError.message || 'You need to be logged in to access this feature';
        errorTitle = 'Authentication Required';
        // Optionally redirect to login after showing error
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        }, 2000);
        break;
        
      case 403:
      case 'FORBIDDEN':
        errorMessage = apiError.message || 'You don\'t have permission to perform this action';
        errorTitle = 'Access Denied';
        break;
        
      case 400:
      case 'BAD_REQUEST':
        errorMessage = apiError.message || 'Invalid request. Please check your input and try again.';
        errorTitle = 'Invalid Request';
        break;
        
      case 404:
      case 'NOT_FOUND':
        errorMessage = apiError.message || 'The requested resource was not found';
        errorTitle = 'Not Found';
        break;
        
      case 422:
      case 'VALIDATION_ERROR':
        errorMessage = apiError.message || 'Please check your input and try again';
        errorTitle = 'Validation Error';
        break;
        
      case 500:
      case 'INTERNAL_ERROR':
        errorMessage = apiError.message || 'A server error occurred. Please try again later.';
        errorTitle = 'Server Error';
        break;
        
      default:
        errorMessage = apiError.message || apiError.error || errorMessage;
        break;
    }
  }
  // Handle error objects with message property
  else if (error?.message) {
    errorMessage = error.message;
  }
  // Handle string errors
  else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Show toast notification
  toast.error(errorMessage, {
    description: errorTitle !== 'Error' ? errorTitle : undefined,
    duration: 5000,
  });
}

/**
 * Wrapper for fetch requests with error handling
 */
export async function apiRequest<T = unknown>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Handle successful responses
    if (response.ok) {
      // Handle responses that might not have JSON content
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return response as unknown as T;
      }
    }

    // Handle error responses
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      // If response is not JSON, create a generic error
      errorData = {
        error: 'Request failed',
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Create structured error object
    const apiError: ApiError = {
      error: errorData.error,
      message: errorData.message || errorData.error,
      code: errorData.code,
      status: response.status,
    };

    throw apiError;
  } catch (error) {
    // If the error is already an ApiError, re-throw it
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Handle network errors or other unexpected errors
    throw {
      error: 'Network error',
      message: 'Unable to connect to the server. Please check your connection.',
      code: 'NETWORK_ERROR',
    } as ApiError;
  }
}

/**
 * Handle authentication errors specifically
 */
export function handleAuthError(error: UnknownError): { title: string; message: string; description: string } {
  let title = 'Authentication Error';
  let message = 'Authentication failed';
  let description = 'Please try again or contact support if the problem persists.';
  
  if (error?.status === 401 || error?.code === 'INVALID_CREDENTIALS') {
    title = 'Invalid Credentials';
    message = 'Invalid email or password';
    description = 'Please check your credentials and try again. Make sure your email and password are correct.';
  } else if (error?.code === 'USER_NOT_FOUND') {
    title = 'Account Not Found';
    message = 'No account found with this email address';
    description = 'Please check your email address or create a new account if you don\'t have one yet.';
  } else if (error?.code === 'MISSING_CREDENTIALS') {
    title = 'Missing Information';
    message = 'Please enter both email and password';
    description = 'Both email and password fields are required to sign in.';
  } else if (error?.code === 'INVALID_EMAIL') {
    title = 'Invalid Email Format';
    message = 'Please enter a valid email address';
    description = 'The email address format appears to be incorrect. Please check and try again.';
  } else if (error?.message) {
    message = error.message;
  }

  return { title, message, description };
}

/**
 * Show success message
 */
export function showSuccess(message: string, description?: string): void {
  toast.success(message, {
    description,
    duration: 4000,
  });
}

/**
 * Show info message  
 */
export function showInfo(message: string, description?: string): void {
  toast.info(message, {
    description,
    duration: 4000,
  });
} 