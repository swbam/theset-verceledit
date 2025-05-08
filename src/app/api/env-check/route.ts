import { NextRequest, NextResponse } from 'next/server';
import { getMissingEnvironmentVariables, checkCategoryEnvironmentVariables } from '@/lib/utils/checkEnv';

// Prevent this route from being cached
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check all environment variables
    const missingVars = getMissingEnvironmentVariables();
    const allValid = missingVars.length === 0;
    
    // Create response with environment status
    const response = {
      success: allValid,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      categories: {
        supabase: isCategoryValid('supabase'),
        ticketmaster: isCategoryValid('ticketmaster'),
        spotify: isCategoryValid('spotify')
      },
      missingVars: missingVars.length > 0 ? missingVars : undefined
    };
    
    return NextResponse.json(response, {
      status: allValid ? 200 : 400
    });
  } catch (error) {
    console.error('Error in environment check:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during environment check',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}

// Helper function to check if all variables in a category are valid
function isCategoryValid(category: 'supabase' | 'ticketmaster' | 'spotify' | 'general'): boolean {
  try {
    checkCategoryEnvironmentVariables(category);
    return true;
  } catch (error) {
    return false;
  }
} 