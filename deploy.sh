#!/bin/bash

# Exit on error
set -e

# Set the Supabase URL and API key as environment variables if provided
if [ ! -z "$1" ]; then
  export SUPABASE_URL=$1
fi

if [ ! -z "$2" ]; then
  export SUPABASE_ANON_KEY=$2
fi

if [ ! -z "$3" ]; then
  export SUPABASE_SERVICE_ROLE_KEY=$3
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install --force

# Run database migrations if they exist
if [ -d "src/db-migrations" ]; then
  echo "Running database migrations..."
  
  # Use Supabase CLI if available, otherwise manual approach
  if command -v supabase &> /dev/null; then
    supabase db push
  else
    echo "Warning: Supabase CLI not found, skipping automatic migrations."
    echo "Please run migrations manually using the Supabase dashboard."
  fi
fi

# Build the app
echo "Building the app..."
pnpm run build

# Start the app
echo "Starting the app..."
NODE_ENV=production pnpm start

echo "Deployment complete!" 