export enum ErrorSource {
  API = 'API',
  Database = 'Database',
  Spotify = 'Spotify',
  Supabase = 'Supabase',
  Setlist = 'Setlist',
  Ticketmaster = 'ticketmaster',
  Unknown = 'unknown'
}

export interface ErrorContext {
  message: string;
  source: ErrorSource;
  originalError?: unknown;
  context?: Record<string, unknown>;
}

export interface ErrorDetails {
  message: string;
  source: ErrorSource;
  originalError?: unknown;
  context?: Record<string, unknown>;
}

/**
 * Centralized error handling for edge functions
 */
export function handleError(error: ErrorContext): void {
  const { message, source, originalError, context } = error;
  
  // Format error details for structured logging
  const errorDetails = {
    message,
    source,
    timestamp: new Date().toISOString(),
    ...(originalError && { originalError: errorToString(originalError) }),
    ...(context && { context })
  };

  // Log error in a structured format
  console.error(JSON.stringify(errorDetails, null, 2));
}

function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
}
