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
# Deploy all edge functions
echo "Deploying sync functions..."
supabase functions deploy sync-artist
supabase functions deploy sync-venue
supabase functions deploy sync-show
supabase functions deploy sync-song
supabase functions deploy sync-setlist
supabase functions deploy fetch-past-setlists
supabase functions deploy orchestrate-sync
supabase functions deploy import-artist
supabase functions deploy vote-song

# Set environment variables
echo "Setting environment variables..."

# Debug: Print environment variables (masked)
echo "Checking environment variables..."
echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}"
echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}"
echo "VITE_SUPABASE_SERVICE_ROLE_KEY=${VITE_SUPABASE_SERVICE_ROLE_KEY}"
echo "VITE_SETLIST_FM_API_KEY=${VITE_SETLIST_FM_API_KEY}"
echo "VITE_TICKETMASTER_API_KEY=${VITE_TICKETMASTER_API_KEY}"
echo "VITE_SPOTIFY_CLIENT_ID=${VITE_SPOTIFY_CLIENT_ID}"
echo "VITE_SPOTIFY_CLIENT_SECRET=${VITE_SPOTIFY_CLIENT_SECRET}"

# Create temporary secrets file
SECRETS_FILE=".env.secrets.temp"

# Debug: Print environment variables (masked)
echo "Checking environment variables..."
echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL:0:8}..."
echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:0:8}..."
echo "VITE_SUPABASE_SERVICE_ROLE_KEY=${VITE_SUPABASE_SERVICE_ROLE_KEY:0:8}..."
echo "VITE_SETLIST_FM_API_KEY=${VITE_SETLIST_FM_API_KEY:0:8}..."
echo "VITE_TICKETMASTER_API_KEY=${VITE_TICKETMASTER_API_KEY:0:8}..."
echo "VITE_SPOTIFY_CLIENT_ID=${VITE_SPOTIFY_CLIENT_ID:0:8}..."
echo "VITE_SPOTIFY_CLIENT_SECRET=${VITE_SPOTIFY_CLIENT_SECRET:0:8}..."

# Create secrets file with consistent naming
{
  echo "API_URL='${VITE_SUPABASE_URL}'"
  echo "API_ANON_KEY='${VITE_SUPABASE_ANON_KEY}'"
  echo "SERVICE_ROLE_KEY='${VITE_SUPABASE_SERVICE_ROLE_KEY}'"
  echo "SETLIST_FM_API_KEY='${VITE_SETLIST_FM_API_KEY}'"
  echo "TICKETMASTER_API_KEY='${VITE_TICKETMASTER_API_KEY}'"
  echo "SPOTIFY_CLIENT_ID='${VITE_SPOTIFY_CLIENT_ID}'"
  echo "SPOTIFY_CLIENT_SECRET='${VITE_SPOTIFY_CLIENT_SECRET}'"
} > "$SECRETS_FILE"

# Debug: Show file contents (masked)
echo "Secrets file contents (masked):"
while IFS= read -r line; do
  key=$(echo "$line" | cut -d'=' -f1)
  value=$(echo "$line" | cut -d'=' -f2)
  echo "$key=${value:0:8}..."
done < "$SECRETS_FILE"

# Set secrets from file
echo "Setting secrets from file..."
supabase secrets set --env-file "$SECRETS_FILE"

# Clean up
rm "$SECRETS_FILE"

# Verify environment variables
echo "Verifying environment variables..."
supabase secrets list

# Apply migrations
echo "Applying migrations..."
node scripts/apply-setlist-migration.js

echo "Deployment complete!"