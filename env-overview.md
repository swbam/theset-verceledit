# Environment Configuration Overview

## Environment Files
- `.env`: Base environment configuration
- `.env.local`: Local development overrides
- `.env.production`: Production environment settings

## Key Components

### Supabase Configuration
- Project ID: `kzjnkqeosrycfpxjwhil`
- Both Vite and Next.js formats supported
- Service role and anonymous keys configured

### External API Integration
1. **Setlist.fm**
   - Used for historical setlist data
   - API key configured for both Vite and Node environments

2. **Ticketmaster**
   - Used for show/venue data
   - API key configured for both Vite and Node environments

3. **Spotify**
   - Used for artist and song data
   - Client ID and Secret configured for both environments

### Application URLs
- Development: `https://theset-verceledit.vercel.app`
- Production: `https://theset.vercel.app`

### Edge Functions
- Dedicated environment variables for Edge Function deployment
- Separate database connection strings
- Service role keys for privileged operations

### Environment-Specific Settings
#### Development
- `NODE_ENV=development`
- `VITE_APP_PORT=8080`
- Shorter cache duration
- Local development secrets

#### Production
- `NODE_ENV=production`
- `VITE_APP_PORT=80`
- Longer cache duration
- Secure production secrets

## Security Notes
- Service role keys should never be exposed to the client
- Production secrets should be managed through Vercel environment variables
- Local development should use `.env.local` for overrides

## Sync Configuration
- `SYNC_VERSION=2` indicates unified sync system
- Edge Functions handle all synchronization
- Cron jobs secured with `CRON_SECRET`

## Important Considerations
1. Always use `VITE_` prefix for client-side variables
2. Use `NEXT_PUBLIC_` prefix for Next.js client-side variables
3. Keep sensitive keys in server-side only variables
4. Use different cache durations for dev/prod
5. Maintain separate revalidation secrets for each environment 