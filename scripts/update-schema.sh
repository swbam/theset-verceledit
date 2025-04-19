#!/bin/bash

# Get the Supabase project ID from environment or use default
PROJECT_ID=${SUPABASE_PROJECT_ID:-"kzjnkqeosrycfpxjwhil"}

# Generate the types
echo "🔄 Generating TypeScript types..."
pnpm supabase gen types typescript --project-id $PROJECT_ID > src/types/supabase.ts

# Deploy all Edge Functions
echo "🚀 Deploying Edge Functions..."
pnpm supabase functions deploy import-artist --project-ref $PROJECT_ID
pnpm supabase functions deploy sync-setlist --project-ref $PROJECT_ID

echo "✅ Schema update complete!"
