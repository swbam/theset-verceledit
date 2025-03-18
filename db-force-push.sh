#!/bin/bash

echo "⚠️  WARNING: This will override the remote Supabase database schema completely!"
echo "Are you sure you want to continue? (y/N)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]
then
    echo "🔄 Forcing schema push to Supabase..."
    
    # Get the database URL from .env
    DB_URL=$(grep DATABASE_URL .env | cut -d '"' -f 2)
    
    # Extract password from the URL
    PGPASSWORD=$(echo $DB_URL | awk -F':' '{print $3}' | awk -F'@' '{print $1}')
    
    # Run the reset script
    psql "$DB_URL" -f supabase/migrations/reset_db.sql
    
    echo "✅ Database schema has been force pushed to Supabase!"
else
    echo "Operation cancelled."
fi 