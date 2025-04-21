# Environment Variable Configuration for Hybrid Vite/Next.js Setup

After reviewing the codebase and environment setup, I've identified that this project uses a hybrid architecture:
- Vite for the frontend components (`dev:frontend`, `build`)
- Next.js for the API routes (`dev:api`, `build:api`)

## Current Issues

The console error "supabaseUrl is required" indicates that the Supabase client can't find the expected environment variables. This is due to how environment variables are accessed differently in Vite vs Next.js.

## Environment Variable Conventions

### Vite (Frontend)
- Uses `VITE_` prefix
- Accessed via `import.meta.env.VITE_*`

### Next.js (API)
- Server-side variables: No prefix, not exposed to client
- Client-side variables: `NEXT_PUBLIC_` prefix
- Accessed via `process.env.*`

## Updated `.env.local` Configuration

```
# Supabase Configuration - Dual format for hybrid setup
SUPABASE_URL=https://kzjnkqeosrycfpxjwhil.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2ODM3ODMsImV4cCI6MjA1ODI1OTc4M30.KOriVTUxlnfiBpWmVrlO4xHM7nniizLgXQ49f2K22UM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjY4Mzc4MywiZXhwIjoyMDU4MjU5NzgzfQ.4-ITsc97-Ts7gy3e6RhjIbCf2awTWdjaG3zXCxkwJpI

# For Next.js API routes
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# For Vite frontend (duplicated for direct access)
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
VITE_SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# API Keys 
# Original format for Next.js API routes
TICKETMASTER_API_KEY=k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b
SPOTIFY_CLIENT_ID=2946864dc822469b9c672292ead45f43
SPOTIFY_CLIENT_SECRET=feaf0fc901124b839b11e02f97d18a8d
SETLIST_FM_API_KEY=xkutflW-aRy_Df9rF4OkJyCsHBYN88V37EBL

# Vite versions for frontend access (when needed)
VITE_TICKETMASTER_API_KEY=${TICKETMASTER_API_KEY}
VITE_SPOTIFY_CLIENT_ID=${SPOTIFY_CLIENT_ID}
VITE_SPOTIFY_CLIENT_SECRET=${SPOTIFY_CLIENT_SECRET}
VITE_SETLIST_FM_API_KEY=${SETLIST_FM_API_KEY}

# Caching Configuration
VITE_API_CACHE_TTL=900000  # 15 minutes in milliseconds
SUPABASE_CACHE_TABLE=api_cache

# Application Settings
VITE_APP_URL=http://localhost:8080
REVALIDATE_SECRET=local_dev_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Development Environment
NODE_ENV=development
```

## Code Updates Required

### For Supabase Client

In `src/integrations/supabase/client.ts`, update the environment variable access to handle both Vite and Next.js formats:

```typescript
// Use Vite environment variables when available, fallback to Next.js format
const SUPABASE_URL = 
  (typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : undefined) || 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.SUPABASE_URL ||
  "https://kzjnkqeosrycfpxjwhil.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = 
  (typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined) ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY ||
  "..."; // default token value
```

## Implementation Steps

1. Update `.env.local` with the above configuration
2. Modify the Supabase client to handle both Vite and Next.js environment variable formats
3. Restart the development server to apply the changes
4. Verify that the "supabaseUrl is required" error is resolved

This approach maintains compatibility with both Vite and Next.js while ensuring all necessary environment variables are available to the appropriate parts of the application.
