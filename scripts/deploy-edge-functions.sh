#!/bin/bash

# Exit on error
set -e

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Deploy Edge Functions
echo "Deploying Edge Functions..."
supabase functions deploy fetch-past-setlists

# Set environment variables
echo "Setting environment variables..."
supabase secrets set SETLISTFM_API_KEY="$VITE_SETLIST_FM_API_KEY"
supabase secrets set SUPABASE_URL="$VITE_SUPABASE_URL"
supabase secrets set SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"

# Apply migrations
echo "Applying migrations..."
node scripts/apply-setlist-migration.js

echo "Deployment complete!"