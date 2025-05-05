#!/bin/bash

# Deploy Sync V2 Fix Implementation
echo "Deploying Sync V2 Fixes..."

# Apply database migration
echo "Applying database migrations..."
npx supabase db push -p ./supabase/migrations/add_sync_status_to_shows.sql

# Run the pnpm updateall command
echo "Running pnpm updateall to update all dependencies and build the application..."
pnpm updateall

# Deploy the Supabase Edge Function
echo "Deploying unified-sync-v2 Edge Function..."
npm run supabase functions deploy unified-sync-v2 --project-ref kzjnkqeosrycfpxjwhil

# Set necessary secrets for the Edge Function
echo "Setting required secrets for the Edge Function..."
npm run supabase secrets set --env-file .env --project-ref kzjnkqeosrycfpxjwhil

echo "Deployment completed successfully!"
echo "---------------------------------------------"
echo "Remember to restart your application if needed."
echo "View the deployment documentation in sync_v2_fix_implementation.md" 