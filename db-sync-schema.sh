#!/bin/bash

echo "🔄 Syncing database schema to Supabase..."
echo "⚠️  WARNING: This will update tables, indices and triggers in your Supabase database!"
echo "Are you sure you want to continue? (y/N)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]
then
    echo "🔄 Running schema sync to Supabase..."
    
    # Get the database URL from .env
    if [ -f .env ]; then
        source <(grep -v '^#' .env | sed -E 's/(.*)=(.*)/export \1="\2"/')
        echo "📋 Loaded database connection from .env file"
    else
        echo "❌ .env file not found!"
        echo "Please create a .env file with DATABASE_URL or provide the URL directly."
        exit 1
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ DATABASE_URL not found in .env file!"
        exit 1
    fi
    
    echo "🗄️ Connecting to database..."
    echo "📁 Running create_tables.sql file..."
    
    # Run the create_tables.sql file
    PGPASSWORD=$(echo $DATABASE_URL | awk -F':' '{print $3}' | awk -F'@' '{print $1}') \
    psql "$DATABASE_URL" -f supabase/create_tables.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Database schema has been successfully synced to Supabase!"
    else
        echo "❌ An error occurred while syncing the schema."
        exit 1
    fi
else
    echo "Operation cancelled."
fi
