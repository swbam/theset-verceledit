import { createClient } from '@supabase/supabase-js';

// Configuration
const ERROR_SAMPLING_RATE = 1.0; // Log 100% of errors
const MAX_ERROR_BATCH_SIZE = 10;

interface ErrorDetails {
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, any>;
  url?: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  componentName?: string;
  tags?: string[];
}

class ErrorTracker {
  private errorQueue: ErrorDetails[] = [];
  private supabaseClient;
  private flushTimeoutId: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private userId: string | undefined;
  private sessionId: string;

  constructor() {
    // Generate a unique session ID
    this.sessionId = this.generateSessionId();
    
    // Initialize Supabase client when ready
    this.supabaseClient = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || ''
    );
    
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError);
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
    
    this.isInitialized = true;
  }

  public setUserId(userId: string | undefined): void {
    this.userId = userId;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private handleGlobalError = (event: ErrorEvent): void => {
    this.captureError(event.error || new Error(event.message), {
      url: window.location.href,
      tags: ['uncaught', 'global-error']
    });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    this.captureError(event.reason, {
      url: window.location.href,
      tags: ['unhandled-rejection']
    });
  };

  public captureError(error: unknown, additionalContext?: Record<string, any>): void {
    if (!this.isInitialized || Math.random() > ERROR_SAMPLING_RATE) {
      return;
    }

    const errorDetails = this.formatError(error, additionalContext);
    this.errorQueue.push(errorDetails);

    // Log to console for development visibility
    console.error('[Error Tracked]:', errorDetails);
    
    // Schedule a flush if not already scheduled
    if (!this.flushTimeoutId && this.errorQueue.length > 0) {
      this.flushTimeoutId = setTimeout(() => this.flushErrors(), 1000);
    }
    
    // Immediate flush if we've reached the batch size
    if (this.errorQueue.length >= MAX_ERROR_BATCH_SIZE) {
      this.flushErrors();
    }
  }

  private formatError(error: unknown, additionalContext?: Record<string, any>): ErrorDetails {
    let message = 'Unknown error';
    let stack: string | undefined;
    let code: string | undefined;
    
    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
      // @ts-ignore - Custom error property
      code = error.code;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      // @ts-ignore - Handle API errors or other objects with message properties
      message = error.message || 'Unknown error object';
      // @ts-ignore - Custom error properties
      code = error.code || error.status;
    }

    return {
      message,
      code,
      stack,
      context: additionalContext,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      tags: additionalContext?.tags,
      componentName: additionalContext?.componentName
    };
  }

  private async flushErrors(): Promise<void> {
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }

    if (this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // Send errors to Supabase or your error tracking system
      await this.supabaseClient.from('client_errors').insert(
        errorsToSend.map(error => ({
          message: error.message,
          error_code: error.code,
          stack_trace: error.stack,
          context: error.context,
          url: error.url,
          user_id: error.userId,
          session_id: error.sessionId,
          component: error.componentName,
          tags: error.tags
        }))
      );
    } catch (error) {
      console.error('Failed to send errors to server:', error);
      // Don't add these back to the queue to avoid infinite loops
    }
  }

  public async createErrorBoundary(component: string) {
    return {
      onError: (error: Error, info: { componentStack: string }) => {
        this.captureError(error, {
          componentName: component,
          componentStack: info.componentStack,
          tags: ['react-error-boundary']
        });
      }
    };
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// Create a function to wrap API calls with error handling
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    errorTracker.captureError(error, context);
    throw error; // Re-throw to allow component-level handling
  }
}

// Function to extract and format API errors from Supabase
export function extractErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  if (error instanceof Error) return error.message;
  
  // Handle Supabase error objects
  // @ts-ignore - Supabase error shape
  if (error.message) return error.message;
  
  // @ts-ignore - Nested error message in Supabase responses
  if (error.error?.message) return error.error.message;
  
  return 'An unexpected error occurred';
}