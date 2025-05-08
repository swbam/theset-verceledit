#!/bin/bash

# Development startup script for TheSet application

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   TheSet Development Environment    ${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo -e "${RED}Error: .env.local file is missing!${NC}"
  echo -e "${YELLOW}Checking for example-env...${NC}"
  
  if [ -f example-env ]; then
    echo -e "${YELLOW}Found example-env. Do you want to copy it to .env.local? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
      cp example-env .env.local
      echo -e "${GREEN}Created .env.local from example-env. Please update it with your own values.${NC}"
    else
      echo -e "${RED}Please create a .env.local file with your environment variables.${NC}"
      exit 1
    fi
  else
    echo -e "${RED}No environment file found. Please create a .env.local file.${NC}"
    exit 1
  fi
fi

# Check for node_modules
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Node modules not found. Installing dependencies...${NC}"
  pnpm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies. Please check your package manager.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Dependencies installed successfully.${NC}"
fi

# Check for Supabase CLI and start Supabase if needed
if command -v supabase &> /dev/null; then
  if [ "$1" == "--with-supabase" ]; then
    echo -e "${YELLOW}Starting Supabase services...${NC}"
    supabase start
    if [ $? -ne 0 ]; then
      echo -e "${RED}Failed to start Supabase. Running without local Supabase.${NC}"
    else
      echo -e "${GREEN}Supabase services started.${NC}"
    fi
  fi
else
  echo -e "${YELLOW}Supabase CLI not found. Skipping local Supabase startup.${NC}"
fi

# Start the application
echo -e "${GREEN}Starting development server...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server.${NC}"
echo -e "${BLUE}======================================${NC}"

# Export variables for Vite from .env.local if needed
export $(grep -v '^#' .env.local | xargs)

# Start development server
pnpm run dev 