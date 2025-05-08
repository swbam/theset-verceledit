import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';

// Rate limiting map (in-memory for now, can be moved to Redis later)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms

// Request validation schema
const SyncRequestSchema = z.object({
  entityType: z.enum(['artist', 'show', 'venue']),
  entityId: z.string().optional(),
  ticketmasterId: z.string().optional(),
  spotifyId: z.string().optional(),
  options: z.object({
    skipDependencies: z.boolean().optional(),
    forceRefresh: z.boolean().optional()
  }).optional()
}).refine(data => {
  if (data.entityType === 'artist' && !data.ticketmasterId) {
    return false;
  }
  if (['show', 'venue'].includes(data.entityType) && !data.entityId) {
    return false;
  }
  return true;
}, {
  message: "Missing required ID field for entity type"
});

// Check rate limit for an IP
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.timestamp > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

export async function POST(req: Request) {
  try {
    // Get client IP for rate limiting
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0] || 'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = SyncRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const payload = validationResult.data;

    // Create service-role supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('unified-sync-v2', {
      body: payload
    });

    if (error) {
      console.error('[unified-sync-v2] Edge Function error:', error);
      return NextResponse.json(
        { error: error.message || 'Edge Function error' },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[unified-sync-v2] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}