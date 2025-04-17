export enum ErrorSource {
  Database = 'database',
  API = 'api',
  Spotify = 'spotify',
  Ticketmaster = 'ticketmaster',
  SetlistFM = 'setlistfm',
  Unknown = 'unknown'
}

export interface ErrorContext {
  [key: string]: unknown;
}

export interface ErrorDetails {
  message: string;
  source: ErrorSource;
  originalError?: unknown;
  context?: ErrorContext;
}

/**
 * Centralized error handling for edge functions
 */
export function handleError(details: ErrorDetails): void {
  const {
    message,
    source,
    originalError,
    context
  } = details;

  // Log error with structured data
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    source,
    message,
    error: originalError instanceof Error ? {
      name: originalError.name,
      message: originalError.message,
      stack: originalError.stack
    } : originalError,
    context
  }));

  // Could add error reporting service integration here
  // e.g., Sentry, LogRocket, etc.
}
