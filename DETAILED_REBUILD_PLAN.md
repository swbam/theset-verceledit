# TheSet – Full Rebuild & Stabilisation Roadmap

> Audience: AI developer (or team) who will implement every task below until the app ships reliably on Vercel + Supabase.  
> Goal: stable, production-ready Next.js 14 (App-Router) site with unified artist/show sync, complete database schema, solid DX, CI, and tests.

---

## Table of Contents
1. Project Snapshot
2. Phase 0 – Baseline Audit & Branch Setup
3. Phase 1 – Database / Supabase Work
4. Phase 2 – Edge Functions (unified-sync-v2)
5. Phase 3 – Secrets & Environment Management
6. Phase 4 – Frontend Architecture (Vite ➜ Next.js)
7. Phase 5 – Shared Libraries & Services
8. Phase 6 – Build / Deploy Pipeline (CI/CD)
9. Phase 7 – Observability & Automated Testing
10. Acceptance Criteria & Sign-off Checklist

---

## 1. Project Snapshot _(current state)_
```
root/
  src/app       ← early Next.js App-Router attempt
  src/pages     ← React-Router / Vite SPA
  vite.config.ts
  server.js     ← Express wrapper serving dist/index.html
  supabase/     ← migrations + edge functions (unified-sync-v2)
  .env.local    ← mixed NEXT_PUBLIC_* + server keys
```
Major pain-points:
* Dual routing frameworks → hydration errors, blank screen.
* Edge function env/secret mismatches → sync failures.
* DB schema drift vs code (venues.ticketmaster_id constraint, songs composite key, etc.).
* No CI, no tests, limited logging.

---

## 2. Phase 0 – Baseline Audit & Branch Setup

### 2.1 Create long-lived `rebuild/next14` branch
```bash
git checkout -b rebuild/next14
```

### 2.2 Tooling versions (lock-in)
| Tool              | Version  |
| ----------------- | -------- |
| Node              | 20.x LTS |
| PNPM              | 9.x      |
| Supabase CLI      | ^1.157.3 |
| Next              | ^14.2.0  |
| @supabase/ssr     | ^0.6.x   |
| Tailwind          | ^3.4.x   |
| Typescript        | ^5.4.x   |

Add an `.nvmrc` and `engines` block in `package.json`.

### 2.3 Initial automated scans
* `pnpm dlx depcheck` – list unused deps.
* `pnpm lint` – collect ESLint baseline.
* `supabase db diff --use-pg-diff-sync` – check remote vs migrations.
Export reports to `/reports/` for reference.

---

## 3. Phase 1 – Database / Supabase Work

### 3.1 Schema Audit
1. Pull latest remote schema:
   ```bash
   pnpm db:pull # wrapper for supabase db pull
   ```
2. Open the largest `remote_schema.sql` (e.g., `20250425...`).
3. Confirm the following entities & constraints:
   | table  | key/constraint |
   | ------ | -------------- |
   | artists | `ticketmaster_id` UNIQUE, `spotify_id` UNIQUE |
   | shows   | `ticketmaster_id` UNIQUE, `artist_id` FK → artists(id), `venue_id` FK → venues(id) |
   | venues  | `ticketmaster_id` UNIQUE |
   | songs   | composite UNIQUE (`spotify_id`, `artist_id`) |
4. If missing, create migration:
   ```bash
   supabase migration new add_uniques_and_indexes
   # edit generated SQL to add constraints & useful indexes
   supabase db push
   ```

### 3.2 RLS & Policies
* Goal: public read, authenticated write (admin UI still uses service role).
* Add RLS ON for each table, then policies:
  ```sql
  -- example for artists
  alter table artists enable row level security;
  create policy "Public read" on artists
    for select using (true);
  create policy "Server insert/update" on artists
    for all using (auth.role() = 'service_role');
  ```

### 3.3 Seed & Fixtures
* Convert `admin.csv`, `artist.csv` to SQL or `supabase seed` format.
* Add `supabase/seed/initial.sql` – can be run locally with `supabase db reset`.

### 3.4 Generate Types
```bash
pnpm db:types
```
Output → `src/integrations/supabase/types.ts`.

---

## 4. Phase 2 – Edge Functions (`unified-sync-v2`)

### 4.1 Secret Management
| Secret env var          | Scope           | Notes |
| ----------------------- | --------------- | ----- |
| SUPABASE_URL            | Edge / All      | set automatically |
| SUPABASE_SERVICE_ROLE_KEY | Edge only     | never exposed to browser |
| TICKETMASTER_API_KEY    | Edge only       | paid tier rate-limit 5,000/day |
| SPOTIFY_CLIENT_ID       | Edge + local    | |
| SPOTIFY_CLIENT_SECRET   | Edge + local    | |

Set locally via `.env.edge` (ignored by git) and run:
```bash
supabase secrets set --env-file .env.edge
```

### 4.2 Refactor Function
* Early guard:
  ```ts
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response('Misconfigured function', {status:500, ...corsHeaders});
  }
  ```
* Wrap external HTTP calls in try/catch; map known HTTP 4xx 5xx to custom errors.
* Pagination: Ticketmaster default 20; loop `page` until `page >= totalPages`.
* Batch song upserts with `for (const chunk of chunks(songs, 250))`.
* At each logical step update `sync_status` JSONB so frontend can poll progressive status.

### 4.3 Local Testing
```bash
supabase functions serve unified-sync-v2 --env-file .env.edge
curl -XPOST http://localhost:54321/functions/v1/unified-sync-v2 \
  -H 'Authorization: Bearer SERVICE_ROLE' \
  -d '{"entityType":"artist","ticketmasterId":"K8vZ9172u6E"}'
```
Expect JSON `{ success:true, showsCount: … }`.

### 4.4 Deployment
```bash
pnpm deploy:function:unified-sync
```

---

## 5. Phase 3 – Secrets & Environment Management

### 5.1 File Conventions
| Layer         | Prefix            | Example               |
| ------------- | ----------------- | --------------------- |
| Browser       | NEXT_PUBLIC_*     | NEXT_PUBLIC_SUPABASE_URL |
| Node (Next)   | (no prefix)       | SUPABASE_SERVICE_ROLE_KEY |
| Edge (Deno)   | same as Node      | SUPABASE_SERVICE_ROLE_KEY |

### 5.2 Vite → Next mapping removal
* Once Vite is removed (phase 4) delete `vite.config.ts` and its env mapping logic.
* Add `next.config.js` with:
  ```js
  export const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SYNC_VERSION: process.env.SYNC_VERSION ?? '2'
  }
  ```

### 5.3 Validate at runtime
* Create util `src/lib/utils/checkEnv.ts` – throws descriptive error on missing critical vars.

---

## 6. Phase 4 – Frontend Architecture (migrate to Next 14 App Router)

### 6.1 Folder Layout
```
src/
  app/
    (main)/layout.tsx   ← wraps children with MainLayout & ErrorBoundary
    page.tsx            ← landing page
    artists/[id]/page.tsx
    shows/[id]/page.tsx
    admin/…
  components/
    ui/… (shadcn)
    artists/
    shows/
  lib/
    api/
    sync/
```

### 6.2 Steps
1. Install Next & peer deps (already in package.json).
2. Remove React-Router; convert each route in `src/pages/**/*` to `app/…/page.tsx`.
3. Delete `index.html`, `vite.config.ts`, `src/main.tsx`.
4. Delete `server.js`; rely on Vercel and `next start` locally.
5. Global providers in `app/providers.tsx` – TanStack Query, Supabase Provider, ThemeProvider.
6. Root layout wraps with `<ErrorBoundary>` so any crash → styled page.
7. Use Next Image and Link where possible.
8. Data fetching patterns:
   * SSR: `export const dynamic = 'force-dynamic'` if hitting Supabase.
   * Client: React Query + Supabase JS.
9. Auth: leverage Supabase auth helpers (`@supabase/ssr`).
10. Admin pages: add middleware `src/middleware.ts` to guard `^/admin`.

### 6.3 Migration acceptance tests
* All old SPA routes must 301 to new equivalents.

---

## 7. Phase 5 – Shared Libraries & Services

### 7.1 `src/lib/sync/unified-sync.ts`
* Replace placeholders:
  ```ts
  export const syncArtist = async (tmId:string, spotifyId?:string) => {
    const res = await fetch('/api/sync', {method:'POST', body:JSON.stringify({entityType:'artist', ticketmasterId:tmId, spotifyId})});
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };
  ```
* Provide `pollSyncStatus(artistId)` that reads `artists.sync_status` every 2s.

### 7.2 Show Save Helper (`src/lib/api/database/shows.ts`)
* Align fields:
  ```ts
  export const saveShow = (payload:UpsertShow) =>
    supabase.from('shows').upsert(payload, {onConflict:'ticketmaster_id'});
  ```

---

## 8. Phase 6 – Build / Deploy Pipeline

### 8.1 GitHub Actions workflow `.github/workflows/ci.yml`
```yaml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
  playwright:
    runs-on: ubuntu-latest
    steps: … run e2e tests
```

### 8.2 Preview Deploys
* Vercel Git integration – each PR gets URL.
* Use environment aliases for staging domain.

---

## 9. Phase 7 – Observability & Automated Testing

### 9.1 Logging
* Edge functions: `import * as Sentry from "jsr:@sentry/deno"`.
* Frontend/server: `@sentry/nextjs`.

### 9.2 Tests
* **Unit (Jest)**: lib helpers.
* **Integration (Playwright)**: user journeys in `tests/journey` (already scaffolded).
* **API Contract**: test `/api/sync` with mocked Supabase client.
* **Supabase RLS**: script using `postgrest` to ensure unauthorized writes fail.

---

## 10. Acceptance Checklist
- [ ] All env vars documented & validated at runtime.
- [ ] Edge function returns success for sample artist.
- [ ] Artists page lists upcoming shows (>0 rows).
- [ ] Sync button updates artist & shows in DB and UI within 60 s.
- [ ] Mobile & desktop responsive (Tailwind breakpoints).
- [ ] CI green; build < 10 MB serverless bundle.
- [ ] Lighthouse performance > 85.
- [ ] No console errors in production.

---

> Once the above checklist passes in staging, merge `rebuild/next14` → `main` and perform production deployment on Vercel. 