#!/bin/bash

# Script to reset the database and run the create_tables.sql file
# This will drop all existing tables and recreate them from the SQL file

echo "WARNING: This will reset the database and all data will be lost."
echo "Are you sure you want to continue? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  echo "Resetting database..."
  
  # Make sure Supabase CLI is installed
  if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI is not installed. Please install it first."
    echo "You can install it with: npm install -g supabase"
    exit 1
  fi
  
  # Run the SQL migration script
  echo "Running database reset script..."
  
  # If using Supabase CLI with local dev
  if [ -d "./supabase" ]; then
    echo "Detected Supabase local setup. Running with Supabase CLI..."
    supabase db reset --db-url "${DATABASE_URL}"
    
    # Run the create_tables.sql file
    echo "Creating tables from SQL file..."
    psql "${DATABASE_URL}" -f ./supabase/create_tables.sql
  else
    # Direct connection using environment variables
    if [ -z "${DATABASE_URL}" ]; then
      echo "DATABASE_URL environment variable is not set."
      echo "Please set it to your Supabase database URL."
      echo "Example: export DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres"
      exit 1
    fi
    
    echo "Running SQL file directly using DATABASE_URL..."
    psql "${DATABASE_URL}" -f ./supabase/create_tables.sql
  fi
  
  echo "Database reset complete."
else
  echo "Database reset cancelled."
fi
