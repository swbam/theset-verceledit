import { SupabaseClient, createClient } from '@supabase/supabase-js';

export interface MiddlewareConfig {
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
  requireAuth?: boolean;
}

export const createMiddleware = (config: MiddlewareConfig) => {
  return async (req: Request): Promise<Response | null> => {
    // Create Supabase client using env variables
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Rate limiting check
    if (config.rateLimit) {
      const ip = req.headers.get('x-real-ip') || 'unknown';
      const key = `rate-limit:${ip}`;
      
      const { data: isAllowed, error } = await supabaseClient.rpc('check_rate_limit', {
        p_key: key,
        p_limit: config.rateLimit.requests,
        p_window: `${config.rateLimit.window} seconds`
      });

      if (error || !isAllowed) {
        return new Response(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Please try again later'
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Authentication check
    if (config.requireAuth) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'Missing authorization header'
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      try {
        const token = authHeader.replace('Bearer ', '');
        const { data, error: authError } = await supabaseClient.auth.getUser(token);

        if (authError || !data.user) {
          return new Response(
            JSON.stringify({
              error: 'Unauthorized',
              message: 'Invalid authorization token'
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid authorization token'
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // If all middleware checks pass, return null to continue to handler
    return null;
  };
};

// Utility function to log audit events
export const logAuditEvent = async (
  supabaseClient: SupabaseClient,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) => {
  try {
    await supabaseClient.rpc('log_audit_event', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_metadata: metadata ? JSON.stringify(metadata) : null
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};