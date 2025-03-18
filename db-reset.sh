#!/bin/bash

# Database connection from .env
DB_URL=$(grep DATABASE_URL .env | cut -d '"' -f 2)

echo "WARNING: This will reset ALL tables in the database."
echo "ALL DATA WILL BE LOST."
read -p "Are you sure you want to continue? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Operation canceled."
  exit 1
fi

echo "Resetting database schema in Supabase..."
PGPASSWORD=$(echo $DB_URL | awk -F':' '{print $3}' | awk -F'@' '{print $1}') \
psql "$DB_URL" -f reset_db.sql

echo "Database schema reset complete!" 