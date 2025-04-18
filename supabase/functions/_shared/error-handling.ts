import { SupabaseClient } from '@supabase/supabase-js';
import { logAuditEvent } from './middleware';

export interface ErrorContext {
  functionName: string;
  userId?: string;
  entityId?: string;
  entityType?: string;
  additionalInfo?: Record<string, any>;
}

export class AppError extends Error {
  public statusCode: number;
  public context?: ErrorContext;

  constructor(message: string, statusCode = 500, context?: ErrorContext) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 400, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Unauthorized', context?: ErrorContext) {
    super(message, 401, context);
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(message = 'Resource not found', context?: ErrorContext) {
    super(message, 404, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', context?: ErrorContext) {
    super(message, 429, context);
  }
}

export const handleError = async (
  error: unknown,
  supabaseClient: SupabaseClient
): Promise<Response> => {
  let statusCode = 500;
  let message = 'An unexpected error occurred';
  let context: ErrorContext | undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    context = error.context;
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Log error
  console.error({
    error: message,
    statusCode,
    context,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });

  // Log audit event for significant errors
  if (context && supabaseClient) {
    try {
      await logAuditEvent(
        supabaseClient,
        'error',
        context.entityType || 'system',
        context.entityId || 'unknown',
        {
          error: message,
          functionName: context.functionName,
          additionalInfo: context.additionalInfo
        }
      );
    } catch (logError) {
      console.error('Failed to log audit event:', logError);
    }
  }

  return new Response(
    JSON.stringify({
      error: {
        message,
        code: context?.functionName ? `${context.functionName}_error` : 'system_error'
      }
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};