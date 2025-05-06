# TheSet - Developer Handover Documentation

## Project Overview
TheSet is a Next.js/Supabase application that manages concert setlists and enables real-time song voting. The app integrates with Ticketmaster for show data and Spotify for artist catalogs.

## Core User Journey
1. User searches for an artist and selects from results
2. User views all shows for that artist
3. User selects a specific show
4. User interacts with show page:
   - Views show details
   - Sees initial 5 songs from Spotify catalog
   - Can add songs to setlist
   - Can upvote songs (both anonymous and authenticated)

## Key Components

### Frontend Architecture
- `/src/app/*` - Next.js 13+ App Router pages and API routes
- `/src/components/*` - Reusable UI components using shadcn/ui
- `/src/hooks/*` - Custom React hooks for data management
- `/src/lib/*` - Utility functions and API helpers

### Critical Hooks
- `use-show-detail.ts`: Manages show data and setlist state
- `use-realtime-votes.ts`: Handles real-time voting updates
- `use-artist-search.ts`: Artist search functionality

### API Routes
- `/api/unified-sync-v2`: Main sync endpoint for artist/show data
- `/api/vote`: Handles song voting (anonymous + authenticated)
- `/api/shows/*`: Show management endpoints
- `/api/artists/*`: Artist data endpoints

## Supabase Integration

### Edge Functions
1. `unified-sync-v2`:
   - Primary data sync function
   - Handles both artist and show data
   - Integrates Ticketmaster and Spotify APIs
   - Manages incremental updates
   - Handles error recovery

2. `vote-song`:
   - Processes votes securely
   - Supports anonymous voting
   - Maintains vote integrity

### Database Tables
- `artists`: Artist profiles and metadata
- `shows`: Concert/event information
- `songs`: Artist song catalogs
- `setlists`: Show setlists
- `votes`: Song votes with user tracking
- `venues`: Venue information

### Realtime Features
- Live vote updates using Supabase realtime subscriptions
- Optimistic UI updates for better UX
- Fallback mechanisms for offline support

## Recent Updates

### Core Improvements
1. Unified Sync System
   - Combined artist and show syncing
   - Improved error handling
   - Better rate limiting
   - Incremental updates

2. Voting System
   - Simplified to upvotes only
   - Anonymous voting support
   - Real-time updates
   - Vote integrity checks

3. Performance Optimizations
   - Optimistic updates
   - Proper loading states
   - Error boundaries
   - Improved caching

### Technical Debt Resolved
- Removed legacy lovable.dev references
- Cleaned up deprecated API routes
- Updated to latest Next.js patterns
- Improved type safety

## Development Guidelines

### Local Setup
1. Clone repository
2. Copy `.env.example` to `.env.local`
3. Configure Supabase and API keys
4. Run `pnpm install`
5. Run `pnpm dev`

### Key Commands
- `pnpm dev`: Local development
- `pnpm build`: Production build
- `pnpm test`: Run tests
- `pnpm lint`: Code linting

### Deployment
- Production: Vercel (auto-deploys from main)
- Edge Functions: Supabase CLI (`supabase deploy`)
- Database: Supabase migrations

## Future Considerations
1. Setlist.fm Integration (planned)
2. Enhanced artist analytics
3. User profiles and preferences
4. Mobile app potential

## Support Contacts
- Supabase Dashboard: [Project URL]
- Vercel Dashboard: [Project URL]
- Documentation: [Internal Wiki] 