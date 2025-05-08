#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`${BLUE}=== TheSet Application Debug Tool ===${RESET}\n`);

// Function to check if a file exists
function checkFile(filePath, description) {
  const fullPath = path.join(rootDir, filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${description}: ${exists ? `${GREEN}Found✓${RESET}` : `${RED}Missing✗${RESET}`}`);
  return exists;
}

// Check important files
console.log(`${BLUE}Checking important files:${RESET}`);
checkFile('src/main.tsx', 'Main entry point');
checkFile('src/App.tsx', 'App component');
checkFile('index.html', 'HTML template');
checkFile('vite.config.ts', 'Vite config');
checkFile('.env.local', 'Environment variables');
checkFile('server.js', 'Express server');

// Check directories
console.log(`\n${BLUE}Checking important directories:${RESET}`);
checkFile('src/components', 'Components directory');
checkFile('src/pages', 'Pages directory');
checkFile('src/app', 'Next.js app directory');
checkFile('supabase/functions/unified-sync-v2', 'Unified sync function');

// Check environment variables
console.log(`\n${BLUE}Checking environment variables:${RESET}`);
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  try {
    const envContent = dotenv.parse(fs.readFileSync(envPath));
    
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'TICKETMASTER_API_KEY',
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET'
    ];
    
    requiredVars.forEach(variable => {
      console.log(`${variable}: ${envContent[variable] ? `${GREEN}Present✓${RESET}` : `${RED}Missing✗${RESET}`}`);
    });
    
    // Check for suspicious values
    if (envContent['SYNC_VERSION'] && envContent['SYNC_VERSION'].includes('%')) {
      console.log(`${YELLOW}Warning: SYNC_VERSION contains invalid character '%'${RESET}`);
    }
  } catch (error) {
    console.error(`${RED}Error reading .env.local: ${error.message}${RESET}`);
  }
} else {
  console.log(`${RED}Environment file .env.local not found!${RESET}`);
}

// Check package installation
console.log(`\n${BLUE}Checking package installation:${RESET}`);
try {
  const deps = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'))).dependencies;
  const requiredPackages = [
    'react',
    'react-dom',
    'react-router-dom',
    '@supabase/supabase-js',
    '@tanstack/react-query'
  ];
  
  requiredPackages.forEach(pkg => {
    console.log(`${pkg}: ${deps[pkg] ? `${GREEN}Installed (${deps[pkg]})✓${RESET}` : `${RED}Missing✗${RESET}`}`);
  });
} catch (error) {
  console.error(`${RED}Error reading package.json: ${error.message}${RESET}`);
}

// Check node modules
console.log(`\n${BLUE}Checking node_modules existence:${RESET}`);
const nodeModulesExists = checkFile('node_modules', 'node_modules directory');

// Try to diagnose any issues
console.log(`\n${BLUE}Diagnostic suggestions:${RESET}`);

if (!nodeModulesExists) {
  console.log(`${YELLOW}- Run 'pnpm install' to install dependencies${RESET}`);
}

if (!checkFile('dist', 'Build output directory')) {
  console.log(`${YELLOW}- Run 'pnpm build' to create a production build${RESET}`);
}

if (checkFile('src/app', 'Next.js app directory') && checkFile('src/pages', 'React Router pages directory')) {
  console.log(`${YELLOW}- Project has both Next.js (/app) and React Router (/pages) structures which may cause conflicts${RESET}`);
  console.log(`${YELLOW}- Consider standardizing on one approach${RESET}`);
}

// Check for build/start commands
console.log(`\n${BLUE}Suggested commands to fix issues:${RESET}`);
console.log(`${GREEN}pnpm run dev${RESET} - Start development server`);
console.log(`${GREEN}pnpm run build${RESET} - Build for production`);
console.log(`${GREEN}pnpm run start:express${RESET} - Start production server`);
console.log(`${GREEN}pnpm run setup:admin${RESET} - Set up admin user`);
console.log(`${GREEN}pnpm run deploy:function:sync-v2${RESET} - Deploy sync function`);

console.log(`\n${BLUE}=== Debug Complete ===${RESET}`); 