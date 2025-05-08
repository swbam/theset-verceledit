/**
 * Utility for checking required environment variables at runtime
 */

type EnvCategory = 'supabase' | 'ticketmaster' | 'spotify' | 'general';

interface EnvVarCheck {
  name: string;
  required: boolean;
  category: EnvCategory;
  isPublic?: boolean; // Whether this is a NEXT_PUBLIC_ var
}

/**
 * Lists of environment variables by category
 */
const ENV_VARS: EnvVarCheck[] = [
  // Supabase
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, category: 'supabase', isPublic: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, category: 'supabase', isPublic: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, category: 'supabase' },
  
  // Ticketmaster
  { name: 'TICKETMASTER_API_KEY', required: true, category: 'ticketmaster' },
  
  // Spotify
  { name: 'SPOTIFY_CLIENT_ID', required: true, category: 'spotify' },
  { name: 'SPOTIFY_CLIENT_SECRET', required: true, category: 'spotify' },
  
  // General
  { name: 'SYNC_VERSION', required: false, category: 'general' }
];

/**
 * Gets the value of an environment variable
 * Handles both browser (NEXT_PUBLIC_* only) and server environments
 */
export function getEnv(name: string): string | undefined {
  if (typeof window !== 'undefined') {
    // Browser can only access NEXT_PUBLIC_ vars
    if (!name.startsWith('NEXT_PUBLIC_')) {
      return undefined;
    }
    return (window as any).__ENV__?.[name] || process.env[name];
  }
  
  // Server - can access all env vars
  return process.env[name];
}

/**
 * Gets a required environment variable or throws if not found
 */
export function getRequiredEnv(name: string): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Required environment variable ${name} is missing`);
  }
  return value;
}

/**
 * Checks if all required environment variables in a specific category are present
 * Throws an error with missing variables if any are missing
 */
export function checkCategoryEnvironmentVariables(category: EnvCategory): void {
  const categoryVars = ENV_VARS.filter(v => v.category === category && v.required);
  const missing: string[] = [];
  
  for (const envVar of categoryVars) {
    if (!getEnv(envVar.name)) {
      missing.push(envVar.name);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required ${category} environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Check if all required environment variables are present
 * Returns true if all required variables are present, false otherwise
 */
export function checkAllEnvironmentVariables(): boolean {
  try {
    const requiredVars = ENV_VARS.filter(v => v.required);
    const missing: string[] = [];
    
    for (const envVar of requiredVars) {
      if (!getEnv(envVar.name)) {
        missing.push(envVar.name);
      }
    }
    
    if (missing.length > 0) {
      console.error(`Missing required environment variables: ${missing.join(', ')}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return false;
  }
}

/**
 * Get a list of missing required environment variables
 * Returns an array of missing variable names
 */
export function getMissingEnvironmentVariables(): string[] {
  const requiredVars = ENV_VARS.filter(v => v.required);
  const missing: string[] = [];
  
  for (const envVar of requiredVars) {
    if (!getEnv(envVar.name)) {
      missing.push(envVar.name);
    }
  }
  
  return missing;
}

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

export function checkEnv() {
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
} 