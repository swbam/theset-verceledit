
/**
 * Type definitions for the user journey test
 */

// Test step function and result types
export interface TestContext {
  artistId?: string;
  spotifyArtistId?: string;
  supabase: any;
  artistTracks?: any[];
  errors: ErrorLog[];
  successes: SuccessLog[];
  [key: string]: any;
}

export interface TestStepResult {
  success: boolean;
  message: string;
  details?: any;
}

export type TestStep = (context: TestContext) => Promise<TestStepResult>;

// Error tracking
export interface ErrorLog {
  step: string;
  source: "API" | "Database" | "Client";
  message: string;
  timestamp: Date;
  details?: any;
}

// Success tracking
export interface SuccessLog {
  step: string;
  message: string;
  timestamp: Date;
  details?: any;
}

// Test results
export interface TestResults {
  startTime: Date;
  endTime: Date | null;
  errors: ErrorLog[];
  successes: SuccessLog[];
  completed: boolean;
  supabase: any; // Changed from optional to required to match TestContext
  artistId?: string;
  spotifyArtistId?: string;
  artistTracks?: any[];
}
