'use client';

import { createContext, useContext } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

// Define the context type
interface SupabaseContextType {
  supabase: SupabaseClient;
}

// Create the context with a default value (undefined)
export const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

/**
 * Hook to use the Supabase client from context
 * Throws an error if used outside of a SupabaseContext.Provider
 */
export function useSupabase(): SupabaseContextType {
  const context = useContext(SupabaseContext);
  
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseContext.Provider');
  }
  
  return context;
} 