# Fixing the Supabase Environment Variables Issue

## Problem Identification

When launching the application, we see the error: "supabaseUrl is required" in the console logs. This indicates that the Supabase client isn't receiving the proper environment variables.

## Root Cause Analysis

After reviewing the codebase and environment files:

1. In `src/integrations/supabase/client.ts`, the code is expecting:
   ```javascript
   const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                        "https://kzjnkqeosrycfpxjwhil.supabase.co";
   const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                                 "..."; // token value
   ```

2. In `.env`, we have:
   ```
   VITE_SUPABASE_URL=https://kzjnkqeosrycfpxjwhil.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```

3. In `.env.local`, we have:
   ```
   SUPABASE_URL=https://kzjnkqeosrycfpxjwhil.supabase.co
   SUPABASE_ANON_KEY=...
   ```

## Solution

There's a variable naming discrepancy. The app is looking for NEXT_PUBLIC_* prefixed variables, but our environment files have VITE_* or no prefix.

### Option 1: Update the `.env` files

Add the NEXT_PUBLIC_* variables to align with what the code is expecting:

```
# Add to .env.local
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
```

### Option 2: Update the client code

Alternatively, we could update `src/integrations/supabase/client.ts` to use the environment variables we already have:

```javascript
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 
                   process.env.SUPABASE_URL ||
                   "https://kzjnkqeosrycfpxjwhil.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 
                                process.env.SUPABASE_ANON_KEY ||
                                "..."; // token value
```

### Recommended Implementation

Option 1 is less invasive and matches the original intent of the code. Let's create a merged `.env.local` file that includes all necessary variables.

## Additional Environment Variable Considerations

- For the sync system to work correctly, ensure the following API keys are present:
  - VITE_TICKETMASTER_API_KEY
  - VITE_SPOTIFY_CLIENT_ID 
  - VITE_SPOTIFY_CLIENT_SECRET
  - VITE_SETLIST_FM_API_KEY

- The `.env.local` file already has these keys but with different prefixes.

## Implementing the Fix

1. Update `.env.local` to include the NEXT_PUBLIC_* variables
2. Restart the development server
3. Verify the error no longer appears in the console
