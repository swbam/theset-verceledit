# Setlist Sync System Comprehensive Fix Plan

## 1. Environment Configuration Overhaul
```mermaid
graph LR
    A[Client] -->|NEXT_PUBLIC_*| B[Browser]
    C[Server] -->|SUPABASE_SERVICE_KEY| D[Edge Functions]
    E[Secrets Vault] -->|Encrypted| F[Database Roles]
    
    style A stroke:#4CAF50
    style C stroke:#2196F3
    style E stroke:#9C27B0
```

**Implementation Steps:**
1. Separate client/server environment variables:
```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# .env.server
SUPABASE_SERVICE_KEY=...
TICKETMASTER_API_KEY=...
```

2. Rotate compromised secrets via MCP:
```xml
<use_mcp_tool>
<server_name>github.com/alexander-zuev/supabase-mcp-server</server_name>
<tool_name>execute_postgresql</tool_name>
<arguments>
{
  "query": "SELECT vault.rotate_secret('SETLIST_FM_API_KEY');"
}
</arguments>
</use_mcp_tool>
```

## 2. Database Schema Normalization
```mermaid
erDiagram
    ARTISTS ||--o{ SHOWS : "has"
    ARTISTS {
        uuid id
        text spotify_id
        jsonb stored_tracks
    }
    SHOWS {
        uuid id
        uuid artist_id
        text tm_event_id
        timestamp show_time
    }
    SETLISTS ||--o{ SHOWS : "documents"
```

**Migration Script:**
```sql
-- migrations/20240615120000_fix_artist_relations.sql
BEGIN;
ALTER TABLE shows 
  ADD CONSTRAINT fk_artist 
  FOREIGN KEY (artist_id) 
  REFERENCES artists(id) 
  ON DELETE CASCADE;

CREATE INDEX idx_artists_spotify ON artists(spotify_id);
COMMIT;
```

## 3. Sync Function Consolidation
```mermaid
graph TD
    A[API Gateway] --> B[Unified Sync Service]
    B --> C[Artist Sync]
    B --> D[Show Sync]
    B --> E[Track Sync]
    C --> F[Spotify Adapter]
    D --> G[Ticketmaster Adapter]
    E --> H[Setlist.fm Adapter]
```

**Function Cleanup:**
```xml
<use_mcp_tool>
<server_name>github.com/modelcontextprotocol/servers/tree/main/src/github</server_name>
<tool_name>push_files</tool_name>
<arguments>
{
  "owner": "octocat",
  "repo": "hello-world",
  "branch": "main",
  "files": [
    {
      "path": "supabase/functions/unified-sync-v2",
      "content": "// New consolidated sync logic..."
    }
  ],
  "message": "feat: Add unified sync service"
}
</arguments>
</use_mcp_tool>
```

## 4. Client Library Security
```mermaid
sequenceDiagram
    Client->>+Supabase: Initialize (ANON_KEY)
    Supabase-->>-Client: Public Schema Access
    Edge Function->>+Database: Service Role
    Database-->>-Edge Function: Full Access
```

**Secure Initialization Pattern:**
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const client = typeof window !== 'undefined' 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  : createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
```

## 5. Deployment Plan
```mermaid
gantt
    title Sync System Deployment Timeline
    dateFormat  YYYY-MM-DD
    section Decommission
    Archive Functions     :done, des1, 2025-05-03, 1d
    Drop Temp Tables      :done, des2, 2025-05-03, 1d
    section Implement
    Schema Migrations     :active, 2025-05-04, 2d
    New Sync Service      :2025-05-06, 3d
    Client Updates        :2025-05-09, 2d
```

**Execution Command:**
```bash
pnpm updateall --force --migrate --clean
```

This plan incorporates all previous audit findings and diagrams. Ready to toggle to Act Mode for implementation.
