#!/bin/bash

# Database connection from .env
DB_URL=$(grep DATABASE_URL .env | cut -d '"' -f 2)

echo "Syncing database schema to Supabase..."
PGPASSWORD=$(echo $DB_URL | awk -F':' '{print $3}' | awk -F'@' '{print $1}') \
psql "$DB_URL" -f supabase/migrations/update_schema.sql

echo "Database schema sync complete!" 