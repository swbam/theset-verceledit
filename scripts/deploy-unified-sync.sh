#!/bin/bash

# Load environment variables
set -a
source .env.edge
set +a

# Deploy the function
echo "Deploying unified-sync-v2 function..."
supabase functions deploy unified-sync-v2

# Set secrets from .env.edge
echo "Setting function secrets..."
supabase secrets set --env-file .env.edge

echo "Deployment complete!" 